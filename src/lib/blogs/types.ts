export type BlogStatus = "DRAFT" | "PUBLISHED";

export type Blog = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content?: string;
  status: BlogStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  author: { name: string };
};

export type BlogPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export function formatDate(value: string | null | undefined): string {
  if (!value) return "Not published";

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}
