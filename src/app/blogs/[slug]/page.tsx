import type { Metadata } from "next";
import { BlogDetail } from "@/components/blogs/blog-detail";

type BlogPageProps = { params: Promise<{ slug: string }> };
export const instant = false;

export async function generateMetadata({
  params,
}: BlogPageProps): Promise<Metadata> {
  const { slug } = await params;
  return { title: decodeURIComponent(slug).replace(/-/g, " ") };
}

export default async function BlogPage({ params }: BlogPageProps) {
  const { slug } = await params;
  return <BlogDetail slug={slug} />;
}
