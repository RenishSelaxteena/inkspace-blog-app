import type { Metadata } from "next";
import { connection } from "next/server";
import { EditBlogPage } from "@/components/blogs/edit-blog-page";
import { requireAuth } from "@/lib/auth";

type EditPageProps = { params: Promise<{ slug: string }> };

export const metadata: Metadata = { title: "Edit story" };
export const instant = false;

export default async function EditPage({ params }: EditPageProps) {
  await connection();
  const { slug } = await params;
  await requireAuth({ redirectTo: `/blogs/${encodeURIComponent(slug)}/edit` });

  return <EditBlogPage id={slug} key={slug} />;
}
