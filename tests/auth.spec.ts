import { randomUUID } from "node:crypto";
import { compare } from "bcryptjs";
import { Client } from "pg";
import { expect, test } from "@playwright/test";

const password = "InkSpace-Test-Password-01!";
const baseURL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
const email = `auth-${randomUUID()}@example.test`;
let database: Client;

test.describe.serial("Credentials authentication", () => {
  test.beforeAll(async () => {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is required for authentication tests.");
    }

    const client = new Client({ connectionString });
    await client.connect();
    database = client;
  });

  test.afterAll(async () => {
    if (database) {
      try {
        await database.query('DELETE FROM "User" WHERE "email" = $1', [email]);
      } finally {
        await database.end();
      }
    }
  });

  test("registers, normalizes email, hashes passwords, and rejects duplicates", async ({
    request,
  }) => {
    const response = await request.post("/api/register", {
      data: {
        name: "Test User",
        email: `  ${email.toUpperCase()}  `,
        password,
        confirmPassword: password,
        id: "client-controlled-id",
        passwordHash: "client-controlled-hash",
      },
    });

    expect(response.status()).toBe(201);
    const payload = await response.json();
    expect(payload.data.user.email).toBe(email);
    expect(payload.data.user.name).toBe("Test User");
    expect(payload.data.user.id).not.toBe("client-controlled-id");
    expect(Object.keys(payload.data.user)).not.toContain("passwordHash");

    const storedUser = await database.query<{ passwordHash: string }>(
      'SELECT "passwordHash" FROM "User" WHERE "email" = $1',
      [email],
    );
    expect(storedUser.rows).toHaveLength(1);
    expect(storedUser.rows[0].passwordHash).not.toBe(password);
    await expect(compare(password, storedUser.rows[0].passwordHash)).resolves.toBe(
      true,
    );

    const duplicate = await request.post("/api/register", {
      data: {
        name: "Another Name",
        email,
        password,
        confirmPassword: password,
      },
    });
    expect(duplicate.status()).toBe(409);
    expect((await duplicate.json()).error.code).toBe("EMAIL_IN_USE");

    const mismatchedPassword = await request.post("/api/register", {
      data: {
        name: "Test User",
        email: `mismatch-${randomUUID()}@example.test`,
        password,
        confirmPassword: "different-password",
      },
    });
    expect(mismatchedPassword.status()).toBe(400);
  });

  test("rejects invalid credentials, preserves a JWT session, and logs out", async ({
    playwright,
  }) => {
    const context = await playwright.request.newContext({ baseURL });

    try {
      const csrf = await context.get("/api/auth/csrf");
      const { csrfToken } = await csrf.json();

      const invalidLogin = await context.post(
        "/api/auth/callback/credentials",
        {
          form: {
            csrfToken,
            email,
            password: "Wrong-Password-123!",
            callbackUrl: `${baseURL}/dashboard`,
            json: "true",
          },
        },
      );
      const invalidResult = await invalidLogin.json();
      expect(invalidResult.url).toContain("CredentialsSignin");
      expect(invalidResult.url).not.toContain(email);

      const validLogin = await context.post(
        "/api/auth/callback/credentials",
        {
          form: {
            csrfToken,
            email: email.toUpperCase(),
            password,
            callbackUrl: `${baseURL}/dashboard`,
            json: "true",
          },
        },
      );
      expect(validLogin.ok()).toBe(true);

      const sessionResponse = await context.get("/api/auth/session");
      const session = await sessionResponse.json();
      expect(session.user.id).toBeTruthy();
      expect(session.user.email).toBe(email);
      expect(Object.keys(session.user)).not.toContain("passwordHash");

      const persistedSession = await context.get("/api/auth/session");
      expect((await persistedSession.json()).user.id).toBe(session.user.id);

      const sessionCookie = (await context.storageState()).cookies.find((cookie) =>
        cookie.name.includes("session-token"),
      );
      expect(sessionCookie?.httpOnly).toBe(true);

      const signOutCsrf = await context.get("/api/auth/csrf");
      const { csrfToken: signOutToken } = await signOutCsrf.json();
      const logout = await context.post("/api/auth/signout", {
        form: {
          csrfToken: signOutToken,
          callbackUrl: `${baseURL}/login`,
          json: "true",
        },
      });
      expect(logout.ok()).toBe(true);

      const afterLogout = await context.get("/api/auth/session");
      expect((await afterLogout.json()).user).toBeUndefined();
    } finally {
      await context.dispose();
    }
  });

  test("redirects unauthenticated protected pages to login with their intended destination", async ({
    request,
  }) => {
    for (const path of [
      "/dashboard",
      "/profile",
      "/blogs/create",
      "/blogs/example-story/edit",
    ]) {
      const response = await request.get(path, { maxRedirects: 0 });
      expect(response.status()).toBe(307);
      const location = new URL(response.headers().location, baseURL);
      expect(location.pathname).toBe("/login");
      expect(location.searchParams.get("callbackUrl")).toBe(path);
    }
  });
});
