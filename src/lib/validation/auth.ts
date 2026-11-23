import { z } from "zod";

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email().max(320, "Email must be 320 characters or fewer."));

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(72, "Password must be no more than 72 characters.")
  .refine(
    (password) => new TextEncoder().encode(password).byteLength <= 72,
    "Password must be 72 bytes or fewer.",
  );

export const registrationSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Name is required.")
      .max(80, "Name must be 80 characters or fewer."),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

export const credentialsSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export type RegistrationInput = z.infer<typeof registrationSchema>;
export type CredentialsInput = z.infer<typeof credentialsSchema>;
