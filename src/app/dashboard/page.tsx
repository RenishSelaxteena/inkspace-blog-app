import type { Metadata } from "next";
import { connection } from "next/server";
import { DashboardContent } from "@/components/blogs/dashboard-content";
import { DashboardNav } from "@/components/blogs/dashboard-nav";
import { requireAuth } from "@/lib/auth";

export const metadata: Metadata = { title: "Your writing room" };
export const instant = false;

export default async function DashboardPage() {
  await connection();
  const user = await requireAuth({ redirectTo: "/dashboard" });

  return (
    <>
      <DashboardNav />
      <DashboardContent name={user.name ?? user.email ?? "writer"} />
    </>
  );
}
