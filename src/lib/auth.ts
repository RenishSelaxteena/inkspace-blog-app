import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
type RequireAuthOptions = { redirect?: false; redirectTo?: string };

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true },
  });
  if (!user) return null;

  return { ...session.user, ...user };
}

export function requireAuth(): Promise<CurrentUser>;
export function requireAuth(options: { redirect: false }): Promise<CurrentUser | null>;
export function requireAuth(options: { redirectTo: string }): Promise<CurrentUser>;
export async function requireAuth(options?: RequireAuthOptions) {
  const user = await getCurrentUser();

  if (!user?.id) {
    if (options?.redirect === false) {
      return null;
    }

    const redirectTo = options?.redirectTo ?? "/dashboard";
    const safePath =
      redirectTo.startsWith("/") &&
      !redirectTo.startsWith("//") &&
      !redirectTo.includes("\\")
        ? redirectTo
        : "/dashboard";
    redirect(`/login?callbackUrl=${encodeURIComponent(safePath)}`);
  }

  return user;
}
