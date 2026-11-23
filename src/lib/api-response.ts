import { NextResponse } from "next/server";

type FieldErrors = Record<string, string[] | undefined>;

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function apiError(
  status: number,
  code: string,
  message: string,
  fields?: FieldErrors,
) {
  return NextResponse.json(
    { error: { code, message, ...(fields ? { fields } : {}) } },
    { status },
  );
}
