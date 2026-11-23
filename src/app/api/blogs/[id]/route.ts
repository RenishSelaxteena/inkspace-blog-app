import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { authenticateApiRequest } from "@/lib/api-auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { blogDetailSelect } from "@/lib/blogs/select";
import {
  generateUniqueSlug,
  SlugGenerationError,
} from "@/lib/blogs/slug";
import { prismaErrorCode } from "@/lib/prisma-error";
import {
  blogIdSchema,
  blogIdentifierSchema,
  updateBlogSchema,
} from "@/lib/validation/blog";

type BlogRouteContext = {
  params: Promise<{ id: string }>;
};

async function getBlogId(params: BlogRouteContext["params"]) {
  const { id } = await params;
  const parsed = blogIdSchema.safeParse(id);
  return parsed.success ? parsed.data : null;
}

async function getBlogIdentifier(params: BlogRouteContext["params"]) {
  const { id } = await params;
  const parsed = blogIdentifierSchema.safeParse(id);
  return parsed.success ? parsed.data : null;
}

function notFound() {
  return apiError(404, "NOT_FOUND", "Blog not found.");
}

export async function GET(_request: Request, context: BlogRouteContext) {
  const identifier = await getBlogIdentifier(context.params);
  if (!identifier) {
    return notFound();
  }

  try {
    const user = await getCurrentUser();
    const blog = await prisma.blog.findFirst({
      where: {
        AND: [
          { OR: [{ id: identifier }, { slug: identifier }] },
          {
            OR: user
              ? [{ status: "PUBLISHED" }, { authorId: user.id }]
              : [{ status: "PUBLISHED" }],
          },
        ],
      },
      select: blogDetailSelect,
    });

    return blog ? apiSuccess({ blog }) : notFound();
  } catch (error) {
    console.error(
      "Blog retrieval failed.",
      error instanceof Error ? error.name : "UnknownError",
    );
    return apiError(500, "INTERNAL_ERROR", "Unable to load blog.");
  }
}

export async function PUT(request: Request, context: BlogRouteContext) {
  const auth = await authenticateApiRequest();
  if ("response" in auth) {
    return auth.response;
  }
  const { user } = auth;

  const id = await getBlogId(context.params);
  if (!id) {
    return notFound();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const parsed = updateBlogSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      400,
      "VALIDATION_ERROR",
      "Please check the submitted information.",
      parsed.error.flatten().fieldErrors,
    );
  }

  try {
    const existing = await prisma.blog.findUnique({
      where: { id },
      select: { id: true, authorId: true, title: true, status: true, publishedAt: true },
    });
    if (!existing) {
      return notFound();
    }
    if (existing.authorId !== user.id) {
      return apiError(403, "FORBIDDEN", "You cannot modify this blog.");
    }

    const { title, content, status } = parsed.data;
    const now = new Date();
    const slug =
      title === existing.title
        ? undefined
        : await generateUniqueSlug(title);
    const publishedAt =
      status === "DRAFT"
        ? null
        : existing.status === "PUBLISHED"
          ? existing.publishedAt ?? now
          : now;

    const blog = await prisma.blog.update({
      where: { id, authorId: user.id },
      data: {
        title,
        content,
        excerpt: parsed.data.excerpt?.trim() || null,
        status,
        publishedAt,
        ...(slug ? { slug } : {}),
      },
      select: blogDetailSelect,
    });

    return apiSuccess({ blog });
  } catch (error) {
    const code = prismaErrorCode(error);
    if (code === "P2002" || error instanceof SlugGenerationError) {
      return apiError(409, "SLUG_CONFLICT", "A blog with this slug already exists.");
    }
    if (code === "P2025") {
      return notFound();
    }

    console.error(
      "Blog update failed.",
      error instanceof Error ? error.name : "UnknownError",
    );
    return apiError(500, "INTERNAL_ERROR", "Unable to update blog.");
  }
}

export async function DELETE(_request: Request, context: BlogRouteContext) {
  const auth = await authenticateApiRequest();
  if ("response" in auth) {
    return auth.response;
  }
  const { user } = auth;

  const id = await getBlogId(context.params);
  if (!id) {
    return notFound();
  }

  try {
    const existing = await prisma.blog.findUnique({
      where: { id },
      select: { authorId: true },
    });
    if (!existing) {
      return notFound();
    }
    if (existing.authorId !== user.id) {
      return apiError(403, "FORBIDDEN", "You cannot delete this blog.");
    }

    await prisma.blog.delete({
      where: { id, authorId: user.id },
    });

    return new Response(null, { status: 204 });
  } catch (error) {
    if (prismaErrorCode(error) === "P2025") {
      return notFound();
    }

    console.error(
      "Blog deletion failed.",
      error instanceof Error ? error.name : "UnknownError",
    );
    return apiError(500, "INTERNAL_ERROR", "Unable to delete blog.");
  }
}
