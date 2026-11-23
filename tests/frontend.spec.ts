import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const baseURL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
const password = "InkSpace-Frontend-Test-Password-01!";
const ownerEmail = `frontend-owner-${randomUUID()}@example.test`;
const otherEmail = `frontend-other-${randomUUID()}@example.test`;
const draftTitle = `A draft ${randomUUID()}`;
const secondDraftTitle = `Another draft ${randomUUID()}`;
let database: Client;
let ownerContext: BrowserContext;
let otherContext: BrowserContext;
let ownerPage: Page;
let otherPage: Page;
let secondDraftId: string;

async function registerAndSignIn(
  page: Page,
  name: string,
  email: string,
) {
  await page.goto("/register");
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/login\?registered=1/);
  await expect(page.getByText("Your account is ready. Sign in to start writing.")).toBeVisible();

  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test.describe.serial("InkSpace frontend", () => {
  test.beforeAll(async ({ browser }) => {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is required for frontend tests.");
    }

    database = new Client({ connectionString });
    await database.connect();
    ownerContext = await browser.newContext({ baseURL });
    otherContext = await browser.newContext({ baseURL });
    ownerPage = await ownerContext.newPage();
    otherPage = await otherContext.newPage();
  });

  test.afterAll(async () => {
    try {
      if (database) {
        await database.query(
          'DELETE FROM "Blog" WHERE "authorId" IN (SELECT "id" FROM "User" WHERE "email" = ANY($1::text[]))',
          [[ownerEmail, otherEmail]],
        );
        await database.query(
          'DELETE FROM "User" WHERE "email" = ANY($1::text[])',
          [[ownerEmail, otherEmail]],
        );
        await database.end();
      }
    } finally {
      if (ownerContext) await ownerContext.close();
      if (otherContext) await otherContext.close();
    }
  });

  test("registers, writes, enforces two-user access, publishes, edits, and deletes", async () => {
    await ownerPage.goto("/");
    await expect(ownerPage.getByRole("heading", { name: /A place for/ })).toBeVisible();
    await registerAndSignIn(ownerPage, "Frontend Owner", ownerEmail);

    await expect(ownerPage.getByRole("link", { name: "Profile" })).toBeVisible();
    await expect(ownerPage.getByRole("link", { name: "Write a story" })).toBeVisible();
    await ownerPage.reload();
    await expect(ownerPage.getByRole("link", { name: "Profile" })).toBeVisible();
    await ownerPage.getByRole("link", { name: "Journal" }).click();
    await expect(ownerPage.getByRole("link", { name: "Write a story" })).toBeVisible();
    await ownerPage.getByRole("link", { name: "Start writing" }).click();
    await expect(ownerPage).toHaveURL(/\/blogs\/create/);
    await expect(ownerPage.getByRole("textbox", { name: "Title" })).toHaveValue("");
    await expect(ownerPage.getByLabel("Your story")).toHaveValue("");

    await otherPage.goto("/");
    await otherPage.getByRole("link", { name: "Start writing" }).click();
    await expect(otherPage).toHaveURL(/\/login\?callbackUrl=/);
    expect(new URL(otherPage.url()).searchParams.get("callbackUrl")).toBe("/blogs/create");
    await expect(otherPage.getByRole("link", { name: "Make a space for your words" })).toBeVisible();
    await otherPage.getByLabel("Email address").fill(ownerEmail);
    await otherPage.getByLabel("Password", { exact: true }).fill(password);
    await otherPage.getByRole("button", { name: "Sign in" }).click();
    await expect(otherPage).toHaveURL(/\/blogs\/create/);
    await expect(otherPage.getByRole("textbox", { name: "Title" })).toHaveValue("");
    await expect(otherPage.getByLabel("Your story")).toHaveValue("");
    await otherPage.reload();
    await expect(otherPage.getByRole("link", { name: "Profile" })).toBeVisible();
    await otherPage.getByRole("link", { name: "Journal" }).click();
    await otherPage.getByRole("link", { name: "Profile" }).click();
    await expect(otherPage.getByRole("heading", { name: "Frontend Owner" })).toBeVisible();
    await otherPage.getByRole("navigation", { name: "Main navigation" })
      .getByRole("link", { name: "Write a story" }).click();
    await expect(otherPage.getByRole("textbox", { name: "Title" })).toHaveValue("");
    await expect(otherPage.getByLabel("Your story")).toHaveValue("");
    await otherPage.getByRole("button", { name: "Sign out" }).click();
    await expect(otherPage).toHaveURL(`${baseURL}/`);
    await otherPage.getByRole("link", { name: "Write a story" }).click();
    await expect(otherPage).toHaveURL(/\/login\?callbackUrl=/);
    expect(new URL(otherPage.url()).searchParams.get("callbackUrl")).toBe("/blogs/create");
    await expect(otherPage.getByRole("link", { name: "Make a space for your words" })).toBeVisible();
    await otherPage.getByLabel("Email address").fill(ownerEmail);
    await otherPage.getByLabel("Password", { exact: true }).fill(password);
    await otherPage.getByRole("button", { name: "Sign in" }).click();
    await expect(otherPage).toHaveURL(/\/blogs\/create/);
    await expect(otherPage.getByRole("textbox", { name: "Title" })).toHaveValue("");
    await expect(otherPage.getByLabel("Your story")).toHaveValue("");
    await otherPage.getByRole("button", { name: "Sign out" }).click();
    await expect(otherPage).toHaveURL(`${baseURL}/`);

    await ownerPage.getByRole("link", { name: "Profile" }).click();
    await expect(ownerPage.getByRole("heading", { name: "Frontend Owner" })).toBeVisible();
    await expect(ownerPage.getByText(ownerEmail)).toBeVisible();

    const emptyCounts = ownerPage.locator(".profile-counts > div");
    await expect(emptyCounts.nth(0).locator("strong")).toHaveText("0");
    await expect(emptyCounts.nth(1).locator("strong")).toHaveText("0");
    await expect(emptyCounts.nth(2).locator("strong")).toHaveText("0");

    await ownerPage.getByRole("button", { name: "Edit profile" }).click();
    await ownerPage.getByLabel("Display name").fill("");
    await ownerPage.getByRole("button", { name: "Save name" }).click();
    await expect(ownerPage.getByText("Display name is required.")).toBeVisible();
    await ownerPage.getByLabel("Display name").fill("Updated Frontend Owner");
    await ownerPage.getByRole("button", { name: "Save name" }).click();
    await expect(ownerPage.getByRole("heading", { name: "Updated Frontend Owner" })).toBeVisible();
    await expect(ownerPage.getByText("Display name updated.")).toBeVisible();

    await ownerPage.getByRole("navigation", { name: "Main navigation" })
      .getByRole("link", { name: "Write a story" }).click();
    await expect(ownerPage).toHaveURL(/\/blogs\/create/);
    await expect(ownerPage.getByRole("textbox", { name: "Title" })).toHaveValue("");
    await expect(ownerPage.getByLabel("Your story")).toHaveValue("");
    await ownerPage.getByRole("textbox", { name: "Title" }).fill(draftTitle);
    await ownerPage.getByLabel("A short introduction").fill("A note from the writing room.");
    const firstStoryContent = "A first paragraph.\n\nA second paragraph.";
    await ownerPage.getByLabel("Your story").fill(firstStoryContent);
    await ownerPage.getByRole("button", { name: "Save as draft" }).click();
    await expect(ownerPage).toHaveURL(/\/dashboard/);
    await expect(ownerPage.getByRole("heading", { name: draftTitle })).toBeVisible();

    await ownerPage.getByRole("link", { name: "Profile" }).click();
    await expect(ownerPage.getByRole("heading", { name: "Updated Frontend Owner" })).toBeVisible();
    const oneDraftCounts = ownerPage.locator(".profile-counts > div");
    await expect(oneDraftCounts.nth(0).locator("strong")).toHaveText("1");
    await expect(oneDraftCounts.nth(1).locator("strong")).toHaveText("0");
    await expect(oneDraftCounts.nth(2).locator("strong")).toHaveText("1");
    await expect(ownerPage.getByRole("link", { name: /View draft/ })).toBeVisible();
    await expect(ownerPage.getByRole("link", { name: /Edit/ }).first()).toBeVisible();
    await expect(ownerPage.getByText("A note from the writing room.")).toBeVisible();

    await ownerPage.getByRole("navigation", { name: "Main navigation" })
      .getByRole("link", { name: "Write a story" }).click();
    await expect(ownerPage.getByRole("textbox", { name: "Title" })).toHaveValue("");
    await expect(ownerPage.getByLabel("Your story")).toHaveValue("");
    const secondStoryContent = "Content that belongs to the second draft only.";
    await ownerPage.getByRole("textbox", { name: "Title" }).fill(secondDraftTitle);
    await ownerPage.getByLabel("Your story").fill(secondStoryContent);
    await ownerPage.getByRole("button", { name: "Save as draft" }).click();
    await expect(ownerPage).toHaveURL(/\/dashboard/);

    const ownBlogsResponse = await ownerContext.request.get("/api/users/me/blogs");
    expect(ownBlogsResponse.status()).toBe(200);
    const ownBlogs = (await ownBlogsResponse.json()) as {
      data: {
        blogs: Array<{
          id: string;
          slug: string;
          status: string;
          title: string;
          content: string;
        }>;
      };
    };
    const draft = ownBlogs.data.blogs.find((blog) => blog.title === draftTitle);
    const secondDraft = ownBlogs.data.blogs.find((blog) => blog.title === secondDraftTitle);
    expect(draft).toBeDefined();
    expect(secondDraft).toBeDefined();
    if (!draft) throw new Error("The new draft was not returned by the API.");
    if (!secondDraft) throw new Error("The second draft was not returned by the API.");
    secondDraftId = secondDraft.id;

    await otherPage.goto("/profile");
    await expect(otherPage).toHaveURL(/\/login\?callbackUrl=/);
    expect(new URL(otherPage.url()).searchParams.get("callbackUrl")).toBe("/profile");
    await otherPage.goto(`/blogs/${encodeURIComponent(draft.slug)}`);
    await expect(otherPage.getByRole("heading", { name: "Story not found" })).toBeVisible();

    await registerAndSignIn(otherPage, "Frontend Reader", otherEmail);
    await otherPage.getByRole("link", { name: "Profile" }).click();
    await expect(otherPage.getByRole("heading", { name: "Frontend Reader" })).toBeVisible();
    await expect(otherPage.getByRole("img", { name: "Profile initials FR" })).toBeVisible();
    await expect(otherPage.getByText(otherEmail)).toBeVisible();
    const otherCounts = otherPage.locator(".profile-counts > div");
    await expect(otherCounts.nth(0).locator("strong")).toHaveText("0");
    await expect(otherCounts.nth(1).locator("strong")).toHaveText("0");
    await expect(otherCounts.nth(2).locator("strong")).toHaveText("0");
    await otherPage.goto(`/blogs/${encodeURIComponent(draft.slug)}`);
    await expect(otherPage.getByRole("heading", { name: "Story not found" })).toBeVisible();

    const deniedUpdate = await otherPage.evaluate(async ({ id }) => {
      const response = await fetch(`/api/blogs/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Not your story",
          content: "This must not replace the owner's draft.",
          excerpt: null,
          status: "PUBLISHED",
        }),
      });
      return response.status;
    }, { id: draft.id });
    expect(deniedUpdate).toBe(403);

    const deniedDelete = await otherPage.evaluate(async ({ id }) => {
      const response = await fetch(`/api/blogs/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      return response.status;
    }, { id: draft.id });
    expect(deniedDelete).toBe(403);

    await ownerPage.goto("/dashboard");
    await ownerPage.getByRole("link", { name: `Edit ${draftTitle}` }).click();
    await expect(ownerPage.getByLabel("Your story")).toHaveValue(firstStoryContent);
    await expect(ownerPage.getByLabel("Your story")).not.toHaveValue(secondStoryContent);
    await ownerPage.getByRole("link", { name: "Leave editor" }).click();
    await ownerPage.getByRole("link", { name: `Edit ${secondDraftTitle}` }).click();
    await expect(ownerPage.getByLabel("Your story")).toHaveValue(secondStoryContent);
    await expect(ownerPage.getByLabel("Your story")).not.toHaveValue(firstStoryContent);
    await ownerPage.getByRole("link", { name: "Leave editor" }).click();
    await ownerPage.getByRole("link", { name: `Edit ${draftTitle}` }).click();
    await expect(ownerPage.getByRole("heading", { name: "Edit your story" })).toBeVisible();
    await ownerPage.getByRole("button", { name: "Publish story" }).click();
    await expect(ownerPage).toHaveURL(/\/blogs\//);
    await expect(ownerPage.getByRole("heading", { name: draftTitle })).toBeVisible();
    await expect(ownerPage.getByRole("link", { name: /Edit story/ })).toBeVisible();
    await expect(ownerPage.getByRole("button", { name: "Delete story" })).toBeVisible();

    await otherPage.goto(ownerPage.url());
    await expect(otherPage.getByRole("heading", { name: draftTitle })).toBeVisible();
    await expect(otherPage.getByRole("link", { name: /Edit story/ })).toHaveCount(0);
    await expect(otherPage.getByRole("button", { name: "Delete story" })).toHaveCount(0);

    const publishedDeniedUpdate = await otherPage.evaluate(async ({ id }) => {
      const response = await fetch(`/api/blogs/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Not your story",
          content: "This must not replace the published story.",
          excerpt: null,
          status: "PUBLISHED",
        }),
      });
      return response.status;
    }, { id: draft.id });
    expect(publishedDeniedUpdate).toBe(403);

    const publishedDeniedDelete = await otherPage.evaluate(async ({ id }) => {
      const response = await fetch(`/api/blogs/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      return response.status;
    }, { id: draft.id });
    expect(publishedDeniedDelete).toBe(403);

    await ownerPage.getByRole("link", { name: /Edit story/ }).click();
    const revisedTitle = `${draftTitle} — revised`;
    await ownerPage.getByRole("textbox", { name: "Title" }).fill(revisedTitle);
    await ownerPage.getByLabel("Your story").fill("The edited story, now ready to share.");
    const [updateResponse] = await Promise.all([
      ownerPage.waitForResponse(
        (response) =>
          response.url().includes(`/api/blogs/${draft.id}`) &&
          response.request().method() === "PUT",
      ),
      ownerPage.getByRole("button", { name: "Publish changes" }).click(),
    ]);
    expect(updateResponse.status()).toBe(200);
    expect((await updateResponse.json()).data.blog.title).toBe(revisedTitle);
    await expect(ownerPage.getByRole("heading", { name: revisedTitle })).toBeVisible();

    await ownerPage.getByRole("navigation", { name: "Main navigation" })
      .getByRole("link", { name: "Write a story" }).click();
    await expect(ownerPage.getByRole("textbox", { name: "Title" })).toHaveValue("");
    await expect(ownerPage.getByLabel("Your story")).toHaveValue("");

    await ownerPage.getByRole("link", { name: "Profile" }).click();
    await expect(ownerPage.locator(".profile-counts > div").nth(0).locator("strong")).toHaveText("2");
    await expect(ownerPage.locator(".profile-counts > div").nth(1).locator("strong")).toHaveText("1");
    await expect(ownerPage.locator(".profile-counts > div").nth(2).locator("strong")).toHaveText("1");
    await ownerPage.getByRole("link", { name: /Read story/ }).first().click();
    await expect(ownerPage.getByRole("heading", { name: revisedTitle })).toBeVisible();

    await ownerPage.getByRole("button", { name: "Delete story" }).click();
    const dialog = ownerPage.getByRole("alertdialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Delete story" }).click();
    await expect(ownerPage).toHaveURL(/\/dashboard/);
    await expect(ownerPage.getByRole("heading", { name: secondDraftTitle })).toBeVisible();
    await expect(ownerPage.locator(".story-row")).toHaveCount(1);

    await otherPage.getByRole("button", { name: "Sign out" }).click();
    await expect(otherPage).toHaveURL(`${baseURL}/`);
    await otherPage.goto("/blogs/create");
    await expect(otherPage).toHaveURL(/\/login\?callbackUrl=/);
    expect(new URL(otherPage.url()).searchParams.get("callbackUrl")).toBe("/blogs/create");
    await otherPage.getByLabel("Email address").fill(otherEmail);
    await otherPage.getByLabel("Password", { exact: true }).fill(password);
    await otherPage.getByRole("button", { name: "Sign in" }).click();
    await expect(otherPage).toHaveURL(/\/blogs\/create/);
    await expect(otherPage.getByRole("textbox", { name: "Title" })).toHaveValue("");
    await expect(otherPage.getByLabel("Your story")).toHaveValue("");
  });

  test("keeps the homepage usable at desktop, tablet, and mobile widths", async () => {
    await otherPage.goto("/");
    for (const width of [1440, 768, 375]) {
      await otherPage.setViewportSize({ width, height: 900 });
      await expect(otherPage.getByRole("heading", { name: /A place for/ })).toBeVisible();
      const overflow = await otherPage.evaluate(() => ({
        hasOverflow: document.documentElement.scrollWidth > window.innerWidth,
        elements: Array.from(document.querySelectorAll("*"))
          .filter((element) => element.getBoundingClientRect().right > window.innerWidth + 1)
          .slice(0, 8)
          .map((element) => {
            const rect = element.getBoundingClientRect();
            return {
              tag: element.tagName,
              className: typeof element.className === "string" ? element.className : "",
              right: Math.round(rect.right),
              width: Math.round(rect.width),
            };
          }),
      }));
      expect(
        overflow.hasOverflow,
        `unexpected horizontal overflow at ${width}px: ${JSON.stringify(overflow.elements)}`,
      ).toBe(false);
    }

    await otherPage.getByRole("button", { name: "Open navigation" }).click();
    await expect(otherPage.getByRole("navigation", { name: "Main navigation" })).toBeVisible();
    await expect(
      otherPage.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Journal" }),
    ).toBeVisible();

    await otherPage.goto("/login");
    await expect(otherPage.getByLabel("Email address")).toBeVisible();
    await otherPage.goto("/register");
    await expect(otherPage.getByLabel("Confirm password")).toBeVisible();
    const formOverflows = await otherPage.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(formOverflows, "auth forms should fit a 375px screen").toBe(false);

    await otherPage.goto("/profile");
    await expect(otherPage.getByRole("heading", { name: "Frontend Reader" })).toBeVisible();
    for (const width of [1440, 768, 375]) {
      await otherPage.setViewportSize({ width, height: 900 });
      const profileOverflows = await otherPage.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      );
      expect(profileOverflows, `profile overflow at ${width}px`).toBe(false);
    }

    await ownerPage.goto(`/blogs/${encodeURIComponent(secondDraftId)}/edit`);
    await expect(ownerPage.getByLabel("Your story")).toBeVisible();
    for (const width of [1440, 768, 375]) {
      await ownerPage.setViewportSize({ width, height: 900 });
      const editorOverflows = await ownerPage.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      );
      expect(editorOverflows, `editor overflow at ${width}px`).toBe(false);
    }
  });
});
