import type { Prisma } from "@/generated/prisma/client";

export const blogSummarySelect = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  status: true,
  publishedAt: true,
  createdAt: true,
  author: {
    select: {
      name: true,
    },
  },
} satisfies Prisma.BlogSelect;

export const blogDetailSelect = {
  ...blogSummarySelect,
  content: true,
  updatedAt: true,
} satisfies Prisma.BlogSelect;
