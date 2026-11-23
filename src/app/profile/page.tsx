import type { Metadata } from "next";
import { connection } from "next/server";
import { ProfileContent } from "@/components/profile/profile-content";
import { requireAuth } from "@/lib/auth";

export const metadata: Metadata = { title: "Profile" };
export const instant = false;

export default async function ProfilePage() {
  await connection();
  await requireAuth({ redirectTo: "/profile" });

  return <ProfileContent />;
}
