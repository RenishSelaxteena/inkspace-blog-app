import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";

export class SlugGenerationError extends Error {
  constructor() {
    super("Unable to generate a unique blog slug.");
    this.name = "SlugGenerationError";
  }
}

function slugBase(title: string): string {
  return (
    title
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 140)
      .replace(/-+$/g, "") || "blog"
  );
}

export async function generateUniqueSlug(title: string): Promise<string> {
  const base = slugBase(title);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const slug = `${base}-${randomBytes(4).toString("hex")}`;
    const existing = await prisma.blog.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!existing) {
      return slug;
    }
  }

  throw new SlugGenerationError();
}
