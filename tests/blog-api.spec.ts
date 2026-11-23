import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { expect, test, type APIRequestContext } from "@playwright/test";

type BlogResponse = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content?: string;
  status: "DRAFT" | "PUBLISHED";
  publishedAt: string | null;
  author: { name: string };
};

const baseURL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
const password = "InkSpace-Blog-Test-Password-01!";
const accountSuffix = randomUUID();
const ownerEmail = `blog-owner-${accountSuffix}@example.test`;
const otherEmail = `blog-other-${accountSuffix}@example.test`;
const searchToken = `inkspace-${randomUUID()}`;
let anonymous: APIRequestContext;
let owner: APIRequestContext;
let other: APIRequestContext;
let database: Client;
let ownerId: string;
let otherId: string;

async function registerAccount(
  context: APIRequestContext,
  name: string,
  email: string,
): Promise<string> {
  const response = await context.post("/api/register", {
    data: {
      name,
      email,
      password,
      confirmPassword: password,
    },
  });
  expect(response.status()).toBe(201);
  const result = (await response.json()) as {
    data: { user: { id: string } };
  };
  return result.data.user.id;
}

async function signIn(
  context: APIRequestContext,
  email: string,
): Promise<void> {
  const csrfResponse = await context.get("/api/auth/csrf");
  const { csrfToken } = (await csrfResponse.json()) as { csrfToken: string };
  const response = await context.post("/api/auth/callback/credentials", {
    form: {
      csrfToken,
      email,
      password,
      callbackUrl: `${baseURL}/dashboard`,
      json: "true",
    },
  });
  expect(response.ok()).toBe(true);
}

async function createBlog(
  context: APIRequestContext,
  title: string,
  status: "DRAFT" | "PUBLISHED" = "PUBLISHED",
): Promise<BlogResponse> {
  const response = await context.post("/api/blogs", {
    data: {
      title,
      content: `Content for ${title}`,
      excerpt: `Summary for ${title}`,
      status,
    },
  });
  expect(response.status()).toBe(201);
  const result = (await response.json()) as { data: { blog: BlogResponse } };
  return result.data.blog;
}

test.describe.serial("Blog REST API", () => {
  test.beforeAll(async ({ playwright }) => {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is required for blog API tests.");
    }

    database = new Client({ connectionString });
    await database.connect();

    anonymous = await playwright.request.newContext({ baseURL });
    owner = await playwright.request.newContext({ baseURL });
    other = await playwright.request.newContext({ baseURL });

    ownerId = await registerAccount(anonymous, "Blog Owner", ownerEmail);
    otherId = await registerAccount(anonymous, "Other User", otherEmail);
    await signIn(owner, ownerEmail);
    await signIn(other, otherEmail);
  });

  test.afterAll(async () => {
    try {
      if (database && ownerId && otherId) {
        await database.query(
          'DELETE FROM "Blog" WHERE "authorId" = ANY($1::text[])',
          [[ownerId, otherId]],
        );
        await database.query(
          'DELETE FROM "User" WHERE "id" = ANY($1::text[])',
          [[ownerId, otherId]],
        );
      }
    } finally {
      if (database) await database.end();
      if (anonymous) await anonymous.dispose();
      if (owner) await owner.dispose();
      if (other) await other.dispose();
    }
  });

  test("requires auth for creation and rejects a client authorId", async () => {
    const unauthenticated = await anonymous.post("/api/blogs", {
      data: {
        title: "Unauthenticated",
        content: "This must not be stored.",
      },
    });
    expect(unauthenticated.status()).toBe(401);
    expect((await unauthenticated.json()).error.code).toBe("UNAUTHENTICATED");

    const unauthenticatedUpdate = await anonymous.put("/api/blogs/missing-blog", {
      data: {
        title: "Unauthenticated",
        content: "This must not be stored.",
        status: "DRAFT",
      },
    });
    expect(unauthenticatedUpdate.status()).toBe(401);
    expect((await anonymous.delete("/api/blogs/missing-blog")).status()).toBe(401);

    const spoofedAuthor = await owner.post("/api/blogs", {
      data: {
        title: "Spoofed author",
        content: "The server must reject this authorId.",
        authorId: otherId,
      },
    });
    expect(spoofedAuthor.status()).toBe(400);
    expect((await spoofedAuthor.json()).error.code).toBe("VALIDATION_ERROR");
  });

  test("creates blogs with server ownership and unique slugs", async () => {
    const title = `Shared title ${randomUUID()}`;
    const first = await createBlog(owner, title);
    const second = await createBlog(owner, title);

    expect(first.slug).toBeTruthy();
    expect(second.slug).toBeTruthy();
    expect(first.slug).not.toBe(second.slug);
    expect(first.author.name).toBe("Blog Owner");

    const storedAuthors = await database.query<{ authorId: string }>(
      'SELECT "authorId" FROM "Blog" WHERE "id" = ANY($1::text[])',
      [[first.id, second.id]],
    );
    expect(storedAuthors.rows).toHaveLength(2);
    expect(storedAuthors.rows.every((row) => row.authorId === ownerId)).toBe(
      true,
    );
  });

  test("lists published blogs with title search and pagination only", async () => {
    const first = await createBlog(owner, `Published ${searchToken} one`);
    const second = await createBlog(owner, `Published ${searchToken} two`);
    const draft = await createBlog(owner, `Draft ${searchToken}`, "DRAFT");

    const query = new URLSearchParams({
      q: searchToken,
      page: "1",
      limit: "1",
    });
    const pageOne = await anonymous.get(`/api/blogs?${query}`);
    expect(pageOne.status()).toBe(200);
    const firstPage = (await pageOne.json()).data;
    expect(firstPage.pagination).toMatchObject({
      page: 1,
      limit: 1,
      total: 2,
      totalPages: 2,
    });
    expect(firstPage.blogs).toHaveLength(1);
    expect(firstPage.blogs[0].status).toBe("PUBLISHED");
    expect(firstPage.blogs[0].author.name).toBe("Blog Owner");
    expect(firstPage.blogs[0].publishedAt).toBeTruthy();
    expect(Object.keys(firstPage.blogs[0])).not.toContain("content");
    expect(Object.keys(firstPage.blogs[0])).not.toContain("passwordHash");

    const pageTwo = await anonymous.get(
      `/api/blogs?${new URLSearchParams({ q: searchToken, page: "2", limit: "1" })}`,
    );
    const secondPage = (await pageTwo.json()).data;
    expect(secondPage.blogs).toHaveLength(1);
    expect(secondPage.blogs[0].id).not.toBe(firstPage.blogs[0].id);
    expect([first.id, second.id]).toContain(firstPage.blogs[0].id);

    const invalidPagination = await anonymous.get("/api/blogs?page=0");
    expect(invalidPagination.status()).toBe(400);

    const publicDetail = await anonymous.get(`/api/blogs/${first.id}`);
    expect(publicDetail.status()).toBe(200);
    expect((await publicDetail.json()).data.blog.author.name).toBe("Blog Owner");
    const publicSlugDetail = await anonymous.get(`/api/blogs/${first.slug}`);
    expect(publicSlugDetail.status()).toBe(200);
    expect((await publicSlugDetail.json()).data.blog.id).toBe(first.id);

    const ownerDraft = await owner.get(`/api/blogs/${draft.id}`);
    expect(ownerDraft.status()).toBe(200);
    expect((await ownerDraft.json()).data.blog.status).toBe("DRAFT");

    const otherDraft = await other.get(`/api/blogs/${draft.id}`);
    expect(otherDraft.status()).toBe(404);
    const anonymousDraft = await anonymous.get(`/api/blogs/${draft.id}`);
    expect(anonymousDraft.status()).toBe(404);
  });

  test("returns only the authenticated user's drafts and published blogs", async () => {
    const ownerResponse = await owner.get("/api/users/me/blogs");
    expect(ownerResponse.status()).toBe(200);
    const ownerBlogs = (await ownerResponse.json()).data.blogs as BlogResponse[];
    expect(ownerBlogs.length).toBeGreaterThan(0);
    expect(ownerBlogs.some((blog) => blog.status === "DRAFT")).toBe(true);
    expect(ownerBlogs.some((blog) => blog.status === "PUBLISHED")).toBe(true);
    expect(Object.keys(ownerBlogs[0])).not.toContain("passwordHash");

    const otherResponse = await other.get("/api/users/me/blogs");
    expect(otherResponse.status()).toBe(200);
    expect((await otherResponse.json()).data.blogs).toEqual([]);

    const unauthenticated = await anonymous.get("/api/users/me/blogs");
    expect(unauthenticated.status()).toBe(401);
  });

  test("validates title, content, and strict request fields", async () => {
    const invalidTitle = await owner.post("/api/blogs", {
      data: {
        title: "x".repeat(121),
        content: "Valid content",
      },
    });
    expect(invalidTitle.status()).toBe(400);

    const emptyContent = await owner.post("/api/blogs", {
      data: {
        title: "Valid title",
        content: "   ",
      },
    });
    expect(emptyContent.status()).toBe(400);

    const existingBlog = await createBlog(owner, `Validation ${randomUUID()}`);
    const invalidUpdate = await owner.put(`/api/blogs/${existingBlog.id}`, {
      data: {
        title: "x".repeat(121),
        content: "Valid content",
        excerpt: null,
        status: "PUBLISHED",
      },
    });
    expect(invalidUpdate.status()).toBe(400);

    const emptyUpdateContent = await owner.put(
      `/api/blogs/${existingBlog.id}`,
      {
        data: {
          title: existingBlog.title,
          content: "   ",
          excerpt: null,
          status: "PUBLISHED",
        },
      },
    );
    expect(emptyUpdateContent.status()).toBe(400);
  });

  test("enforces owner-only edits and correct publication timestamps", async () => {
    const blog = await createBlog(owner, `Protected ${randomUUID()}`);
    const originalPublishedAt = blog.publishedAt;

    const otherUpdate = await other.put(`/api/blogs/${blog.id}`, {
      data: {
        title: "Attempted takeover",
        content: "Not allowed.",
        excerpt: null,
        status: "PUBLISHED",
      },
    });
    expect(otherUpdate.status()).toBe(403);

    const otherDelete = await other.delete(`/api/blogs/${blog.id}`);
    expect(otherDelete.status()).toBe(403);

    const ownerUpdate = await owner.put(`/api/blogs/${blog.id}`, {
      data: {
        title: `Updated ${randomUUID()}`,
        content: "Updated by its owner.",
        excerpt: "Updated summary",
        status: "PUBLISHED",
      },
    });
    expect(ownerUpdate.status()).toBe(200);
    const updatedBlog = (await ownerUpdate.json()).data.blog as BlogResponse;
    expect(updatedBlog.title).toContain("Updated");
    expect(updatedBlog.slug).not.toBe(blog.slug);
    expect(updatedBlog.publishedAt).toBe(originalPublishedAt);

    const draft = await createBlog(owner, `Transition ${randomUUID()}`, "DRAFT");
    const publish = await owner.put(`/api/blogs/${draft.id}`, {
      data: {
        title: draft.title,
        content: draft.content,
        excerpt: draft.excerpt,
        status: "PUBLISHED",
      },
    });
    expect(publish.status()).toBe(200);
    const publishedDraft = (await publish.json()).data.blog as BlogResponse;
    expect(publishedDraft.publishedAt).toBeTruthy();

    const unpublish = await owner.put(`/api/blogs/${draft.id}`, {
      data: {
        title: draft.title,
        content: draft.content,
        excerpt: draft.excerpt,
        status: "DRAFT",
      },
    });
    expect(unpublish.status()).toBe(200);
    expect((await unpublish.json()).data.blog.publishedAt).toBeNull();
  });

  test("allows owner deletion and returns 404 for missing blog IDs", async () => {
    const blog = await createBlog(owner, `Delete ${randomUUID()}`);
    const deletion = await owner.delete(`/api/blogs/${blog.id}`);
    expect(deletion.status()).toBe(204);
    expect(await deletion.text()).toBe("");
    expect((await owner.get(`/api/blogs/${blog.id}`)).status()).toBe(404);

    const missingId = `missing-${randomUUID()}`;
    expect((await anonymous.get(`/api/blogs/${missingId}`)).status()).toBe(404);
    expect((await anonymous.get("/api/blogs/invalid!id")).status()).toBe(404);
    expect(
      (
        await owner.put(`/api/blogs/${missingId}`, {
          data: {
            title: "Missing",
            content: "No blog exists.",
            status: "DRAFT",
          },
        })
      ).status(),
    ).toBe(404);
    expect((await owner.delete(`/api/blogs/${missingId}`)).status()).toBe(404);
  });

  test("returns and updates only the authenticated user's profile and story counts", async () => {
    const ownProfileResponse = await owner.get("/api/users/me");
    expect(ownProfileResponse.status()).toBe(200);
    const ownProfile = (await ownProfileResponse.json()).data.profile;
    expect(ownProfile).toMatchObject({
      id: ownerId,
      name: "Blog Owner",
      email: ownerEmail,
    });

    const counts = await database.query<{
      total: string;
      published: string;
      drafts: string;
    }>(
      `SELECT COUNT(*)::text AS total,
        COUNT(*) FILTER (WHERE "status" = 'PUBLISHED')::text AS published,
        COUNT(*) FILTER (WHERE "status" = 'DRAFT')::text AS drafts
       FROM "Blog" WHERE "authorId" = $1`,
      [ownerId],
    );
    expect(ownProfile.storyCounts).toEqual({
      total: Number(counts.rows[0].total),
      published: Number(counts.rows[0].published),
      drafts: Number(counts.rows[0].drafts),
    });

    const otherProfileResponse = await other.get("/api/users/me");
    expect(otherProfileResponse.status()).toBe(200);
    const otherProfile = (await otherProfileResponse.json()).data.profile;
    expect(otherProfile).toMatchObject({
      id: otherId,
      name: "Other User",
      email: otherEmail,
      storyCounts: { total: 0, published: 0, drafts: 0 },
    });
    expect((await anonymous.get("/api/users/me")).status()).toBe(401);

    const spoofedUpdate = await owner.patch("/api/users/me", {
      data: { name: "Changed name", userId: otherId },
    });
    expect(spoofedUpdate.status()).toBe(400);

    const invalidUpdate = await owner.patch("/api/users/me", {
      data: { name: "   " },
    });
    expect(invalidUpdate.status()).toBe(400);

    const update = await owner.patch("/api/users/me", {
      data: { name: "Updated Blog Owner" },
    });
    expect(update.status()).toBe(200);
    expect((await update.json()).data.user).toMatchObject({
      id: ownerId,
      name: "Updated Blog Owner",
      email: ownerEmail,
    });
    const unchangedOther = await database.query<{ name: string }>(
      'SELECT "name" FROM "User" WHERE "id" = $1',
      [otherId],
    );
    expect(unchangedOther.rows[0].name).toBe("Other User");
  });
});
