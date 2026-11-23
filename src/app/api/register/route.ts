import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { registrationSchema } from "@/lib/validation/auth";

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

function errorResponse(
  status: number,
  code: string,
  message: string,
  fields?: Record<string, string[] | undefined>,
) {
  return NextResponse.json(
    { error: { code, message, ...(fields ? { fields } : {}) } },
    { status },
  );
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const parsed = registrationSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse(
      400,
      "VALIDATION_ERROR",
      "Please check the submitted information.",
      parsed.error.flatten().fieldErrors,
    );
  }

  const { name, email, password } = parsed.data;

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      return errorResponse(
        409,
        "EMAIL_IN_USE",
        "An account with this email already exists.",
      );
    }

    const passwordHash = await hash(password, 12);
    const user = await prisma.user.create({
      data: { name, email, passwordHash },
      select: { id: true, name: true, email: true },
    });

    return NextResponse.json({ data: { user } }, { status: 201 });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return errorResponse(
        409,
        "EMAIL_IN_USE",
        "An account with this email already exists.",
      );
    }

    console.error(
      "Registration failed.",
      error instanceof Error ? error.name : "UnknownError",
    );
    return errorResponse(
      500,
      "INTERNAL_ERROR",
      "Unable to complete registration.",
    );
  }
}
