import { z } from "zod";

export const updateProfileSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Display name is required.")
      .max(80, "Display name must be 80 characters or fewer."),
  })
  .strict();

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
