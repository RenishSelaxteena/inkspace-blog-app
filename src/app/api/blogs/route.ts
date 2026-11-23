import { prisma } from "@/lib/db";
import { authenticateApiRequest } from "@/lib/api-auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { blogDetailSelect, blogSummarySelect } from "@/lib/blogs/select";
import {
  generateUniqueSlug,
  SlugGenerationError,
} from "@/lib/blogs/slug";
import { prismaErrorCode } from "@/lib/prisma-error";
import { blogListQuerySchema, createBlogSchema } from "@/lib/validation/blog";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = blogListQuerySchema.safeParse({
    page: url.searchParams.get("page") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
    q: url.searchParams.get("q") ?? undefined,
  });

  if (!parsed.success) {
    return apiError(
      400,
      "VALIDATION_ERROR",
      "Invalid pagination or search parameters.",
      parsed.error.flatten().fieldErrors,
    );
  }

  const { page, limit, q } = parsed.data;
  const where = {
    status: "PUBLISHED" as const,
    ...(q ? { title: { contains: q, mode: "insensitive" as const } } : {}),
  };

  try {
    const [blogs, total] = await Promise.all([
      prisma.blog.findMany({
        where,
        orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
        select: blogSummarySelect,
      }),
      prisma.blog.count({ where }),
    ]);

    return apiSuccess({
      blogs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error(
      "Public blog listing failed.",
      error instanceof Error ? error.name : "UnknownError",
    );
    return apiError(500, "INTERNAL_ERROR", "Unable to load blogs.");
  }
}

export async function POST(request: Request) {
  const auth = await authenticateApiRequest();
  if ("response" in auth) {
    return auth.response;
  }
  const { user } = auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const parsed = createBlogSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      400,
      "VALIDATION_ERROR",
      "Please check the submitted information.",
      parsed.error.flatten().fieldErrors,
    );
  }

  const { title, content, status } = parsed.data;
  const excerpt = parsed.data.excerpt?.trim() || null;
  const now = new Date();

  try {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const slug = await generateUniqueSlug(title);

      try {
        const blog = await prisma.blog.create({
          data: {
            title,
            content,
            excerpt,
            status,
            slug,
            authorId: user.id,
            publishedAt: status === "PUBLISHED" ? now : null,
            createdAt: now,
            updatedAt: now,
          },
          select: blogDetailSelect,
        });

        return apiSuccess({ blog }, 201);
      } catch (error) {
        if (prismaErrorCode(error) !== "P2002") {
          throw error;
        }
      }
    }

    return apiError(409, "SLUG_CONFLICT", "Unable to create a unique blog slug.");
  } catch (error) {
    if (error instanceof SlugGenerationError) {
      return apiError(409, "SLUG_CONFLICT", "Unable to create a unique blog slug.");
    }

    console.error(
      "Blog creation failed.",
      error instanceof Error ? error.name : "UnknownError",
    );
    return apiError(500, "INTERNAL_ERROR", "Unable to create blog.");
  }
}
