export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

type ApiPayload<T> =
  | { data: T }
  | { error: { code?: string; message?: string } };

export async function apiRequest<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(input, init);
  let payload: ApiPayload<T>;

  try {
    payload = (await response.json()) as ApiPayload<T>;
  } catch {
    throw new ApiRequestError("The server returned an unreadable response.", response.status);
  }

  if (!response.ok || !("data" in payload)) {
    const error = "error" in payload ? payload.error : undefined;
    throw new ApiRequestError(
      error?.message ?? "The request could not be completed.",
      response.status,
      error?.code,
    );
  }

  return payload.data;
}

export async function apiDelete(input: RequestInfo | URL): Promise<void> {
  const response = await fetch(input, { method: "DELETE" });
  if (response.status === 204) return;

  let payload: ApiPayload<never>;
  try {
    payload = (await response.json()) as ApiPayload<never>;
  } catch {
    throw new ApiRequestError(
      "The server returned an unreadable response.",
      response.status,
    );
  }

  const error = "error" in payload ? payload.error : undefined;
  throw new ApiRequestError(
    error?.message ?? "The request could not be completed.",
    response.status,
    error?.code,
  );
}

export function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiRequestError ? error.message : fallback;
}
