import { apiError } from "@/lib/api-response";
import { getCurrentUser, requireAuth } from "@/lib/auth";

type AuthenticatedUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

type ApiAuthResult =
  | { user: AuthenticatedUser; response?: never }
  | { user?: never; response: ReturnType<typeof apiError> };

export async function authenticateApiRequest(): Promise<ApiAuthResult> {
  try {
    const user = await requireAuth({ redirect: false });
    if (user) {
      return { user };
    }

    return {
      response: apiError(401, "UNAUTHENTICATED", "Authentication is required."),
    };
  } catch (error) {
    console.error(
      "API authentication check failed.",
      error instanceof Error ? error.name : "UnknownError",
    );
    return {
      response: apiError(500, "INTERNAL_ERROR", "Unable to verify authentication."),
    };
  }
}
