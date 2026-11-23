import { prisma } from "@/lib/db";
import { authenticateApiRequest } from "@/lib/api-auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { prismaErrorCode } from "@/lib/prisma-error";
import { updateProfileSchema } from "@/lib/validation/profile";

export async function GET() {
  const auth = await authenticateApiRequest();
  if ("response" in auth) return auth.response;

  try {
    const [user, statusCounts] = await Promise.all([
      prisma.user.findUnique({
        where: { id: auth.user.id },
        select: {
          id: true,
          name: true,
          email: true,
          _count: { select: { blogs: true } },
        },
      }),
      prisma.blog.groupBy({
        by: ["status"],
        where: { authorId: auth.user.id },
        _count: { _all: true },
      }),
    ]);

    if (!user) {
      return apiError(404, "NOT_FOUND", "Profile not found.");
    }

    const published =
      statusCounts.find(({ status }) => status === "PUBLISHED")?._count._all ?? 0;
    const drafts =
      statusCounts.find(({ status }) => status === "DRAFT")?._count._all ?? 0;

    return apiSuccess({
      profile: {
        id: user.id,
        name: user.name,
        email: user.email,
        storyCounts: {
          total: user._count.blogs,
          published,
          drafts,
        },
      },
    });
  } catch (error) {
    console.error(
      "Current user's profile could not be loaded.",
      error instanceof Error ? error.name : "UnknownError",
    );
    return apiError(500, "INTERNAL_ERROR", "Unable to load your profile.");
  }
}

export async function PATCH(request: Request) {
  const auth = await authenticateApiRequest();
  if ("response" in auth) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      400,
      "VALIDATION_ERROR",
      "Please check the submitted information.",
      parsed.error.flatten().fieldErrors,
    );
  }

  try {
    const user = await prisma.user.update({
      where: { id: auth.user.id },
      data: { name: parsed.data.name },
      select: { id: true, name: true, email: true },
    });

    return apiSuccess({ user });
  } catch (error) {
    if (prismaErrorCode(error) === "P2025") {
      return apiError(404, "NOT_FOUND", "Profile not found.");
    }

    console.error(
      "Current user's profile could not be updated.",
      error instanceof Error ? error.name : "UnknownError",
    );
    return apiError(500, "INTERNAL_ERROR", "Unable to update your profile.");
  }
}
