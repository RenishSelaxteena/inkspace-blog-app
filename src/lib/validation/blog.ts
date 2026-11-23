import { z } from "zod";

const blogFields = {
  title: z
    .string()
    .trim()
    .min(1, "Title is required.")
    .max(120, "Title must be 120 characters or fewer."),
  content: z.string().trim().min(1, "Content is required."),
  excerpt: z
    .string()
    .trim()
    .max(280, "Excerpt must be 280 characters or fewer.")
    .nullable()
    .optional(),
};

export const blogStatusSchema = z.enum(["DRAFT", "PUBLISHED"]);

export const createBlogSchema = z
  .object({
    ...blogFields,
    status: blogStatusSchema.default("DRAFT"),
  })
  .strict();

export const updateBlogSchema = z
  .object({
    ...blogFields,
    status: blogStatusSchema,
  })
  .strict();

export const blogListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  q: z.string().trim().max(120).optional(),
});

export const blogIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[a-zA-Z0-9_-]+$/);

export const blogIdentifierSchema = z
  .string()
  .trim()
  .min(1)
  .max(160)
  .regex(/^[a-zA-Z0-9_-]+$/);

export const blogInputSchema = createBlogSchema;

export type BlogInput = z.infer<typeof createBlogSchema>;
export type BlogUpdateInput = z.infer<typeof updateBlogSchema>;
