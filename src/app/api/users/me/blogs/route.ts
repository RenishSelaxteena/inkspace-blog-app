import { connection } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateApiRequest } from "@/lib/api-auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { blogDetailSelect } from "@/lib/blogs/select";

export async function GET() {
  await connection();

  const auth = await authenticateApiRequest();
  if ("response" in auth) {
    return auth.response;
  }
  const { user } = auth;

  try {
    const blogs = await prisma.blog.findMany({
      where: { authorId: user.id },
      orderBy: { updatedAt: "desc" },
      select: blogDetailSelect,
    });

    return apiSuccess({ blogs });
  } catch (error) {
    console.error(
      "Current user's blogs could not be loaded.",
      error instanceof Error ? error.name : "UnknownError",
    );
    return apiError(500, "INTERNAL_ERROR", "Unable to load your blogs.");
  }
}
