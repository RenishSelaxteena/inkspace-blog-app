import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { BlogForm } from "@/components/blogs/blog-form";
import { DashboardNav } from "@/components/blogs/dashboard-nav";
import { requireAuth } from "@/lib/auth";

export const metadata: Metadata = { title: "Write a story" };
export const instant = false;

type CreateBlogPageProps = {
  searchParams: Promise<{ fresh?: string }>;
};

export default async function CreateBlogPage({ searchParams }: CreateBlogPageProps) {
  await connection();
  await requireAuth({ redirectTo: "/blogs/create" });
  const { fresh } = await searchParams;

  return (
    <main className="editor-page">
      <div className="editor-topline">
        <Link href="/dashboard">← Back to your stories</Link>
      </div>
      <header className="editor-heading">
        <p className="eyebrow">The writing room</p>
        <h1>Begin with a thought.</h1>
        <p>
          Give your idea a title, then let it find its shape. You can save a
          private draft at any time.
        </p>
      </header>
      <DashboardNav active="new" />
      <BlogForm instanceKey={fresh} />
    </main>
  );
}
