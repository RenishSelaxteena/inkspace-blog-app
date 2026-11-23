# InkSpace

InkSpace is a full-stack editorial blogging application built with Next.js App Router, TypeScript, Tailwind CSS, PostgreSQL 17, Prisma, NextAuth Credentials, bcryptjs, Zod, and React Hook Form. It provides public stories, authenticated publishing, an owner-scoped profile, and a protected writing dashboard.

## Features

- Register and sign in with email/password; passwords are stored as bcrypt hashes.
- Browse, search, and paginate published stories.
- Create drafts, publish, edit, and delete only your own stories.
- View private drafts only when signed in as their author.
- Manage your display name and review your own published stories and drafts.
- Responsive editorial UI with client/server validation and accessible feedback.

## Technology

- Next.js App Router, React, TypeScript, and Tailwind CSS 4.
- PostgreSQL 17 and Prisma 7 with committed SQL migrations.
- NextAuth v4 Credentials with JWT sessions.
- bcryptjs, Zod, React Hook Form, and Playwright.

## Architecture and project structure

The UI uses Server Components for protected page checks and Client Components for interactive forms and API-backed lists. Route handlers own validation, authentication, and authorization; Prisma queries derive ownership from the verified server session.

```text
prisma/
  migrations/       PostgreSQL migration history
  schema.prisma     User and Blog models
src/
  app/              Pages and REST route handlers (app/api)
  components/       Editorial UI, forms, and navigation
  lib/              Auth, Prisma, API responses, slugs, and Zod schemas
  types/            NextAuth session type augmentation
tests/              Auth, API, and Playwright browser tests
```

## Requirements

- Node.js 20.19+ (Node.js 22 LTS recommended)
- npm
- A locally installed PostgreSQL 17 server

## Local setup

1. Create a local database named `inkspace` using your PostgreSQL 17 installation. For example, from `psql`:

   ```sql
   CREATE DATABASE inkspace;
   ```

2. Copy `.env.example` to `.env` and replace the placeholder database username and password with your local PostgreSQL credentials. Generate a local secret with `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"` and replace the `NEXTAUTH_SECRET` placeholder. Keep `.env` private; it is ignored by Git.

   ```powershell
   Copy-Item .env.example .env
   ```

3. Install dependencies. The `postinstall` script generates the Prisma Client:

   ```powershell
   npm install
   ```

4. Apply committed migrations, then start the development server:

   ```powershell
   npm run db:deploy
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string used by Prisma's PostgreSQL adapter and migrations. |
| `NEXTAUTH_URL` | Canonical application origin, such as `http://localhost:3000` locally. |
| `NEXTAUTH_SECRET` | Random secret used to sign/encrypt NextAuth JWT session cookies. |

`.env.example` contains placeholders only. Use separate credentials and a strong, unique secret for each deployed environment; never commit `.env`.

## Prisma and migrations

Prisma is configured for PostgreSQL. The `User` and `Blog` models and their migration history are in `prisma/schema.prisma` and `prisma/migrations`.

Create and apply a development migration after a schema change with:

```powershell
npx prisma migrate dev --name <migration_name>
```

Prisma records migrations in source control. For deployment, apply committed migrations with:

```powershell
npm run db:deploy
```

Regenerate the Prisma client after schema changes with:

```powershell
npm run db:generate
```

Do not use `prisma db push` as a replacement for migrations in this project.

The client is also generated automatically by `npm install`/`npm ci` through the `postinstall` script. This is required because `src/generated/prisma` is generated locally and excluded from Git.

### User and blog deletion

Each blog references its author through a PostgreSQL foreign key with `ON DELETE RESTRICT`. PostgreSQL rejects deletion of a user who still has blogs, preserving those blog records. The migration that sets this rule changes only the foreign-key constraint; it does not delete or update existing user or blog records.

## Authentication

Registration is handled by `POST /api/register`. It validates the name, normalized email, password and confirmation, rejects duplicate emails, and stores a bcryptjs password hash. Responses never include the password hash.

Login and logout use the installed NextAuth v4 Credentials provider. Sessions use JWTs; the server-side session includes the authenticated user ID. Session cookies are HTTP-only and secure in production. `getCurrentUser()` verifies the session ID against the user record; database errors are not treated as anonymous sessions. `requireAuth()` protects the dashboard, profile, create, and edit pages and preserves the intended local destination through login.

The local `.env` must define `DATABASE_URL`, `NEXTAUTH_URL`, and a randomly generated `NEXTAUTH_SECRET`. Do not commit `.env` or share its secret.

## Blog REST API

| Method and path | Access | Behavior |
|---|---|---|
| `GET /api/blogs?page=1&limit=10&q=term` | Public | Lists published blogs only; searches titles and paginates results. |
| `GET /api/blogs/[id-or-slug]` | Public / owner | Shows published blogs publicly; only the author can view a draft. Unavailable drafts return `404`. |
| `POST /api/blogs` | Authenticated | Creates a draft or published blog. The server assigns the author and generates a unique slug. |
| `PUT /api/blogs/[id]` | Owner | Replaces the blog fields, updates its slug if the title changes, and maintains publication timestamps. |
| `DELETE /api/blogs/[id]` | Owner | Deletes the blog and returns `204` with no body. |
| `GET /api/users/me/blogs` | Authenticated | Lists only the current user's drafts and published blogs. |
| `GET /api/users/me` | Authenticated | Returns the current user's profile and total/published/draft counts. |
| `PATCH /api/users/me` | Authenticated | Updates only the current user's validated display name. |

JSON successes use `{ "data": ... }`; errors use `{ "error": { "code": "...", "message": "...", "fields": ... } }` when validation details apply. Blog mutations validate on the server. Ownership is derived from the verified Auth.js session, never from a request-supplied `authorId`.

## Frontend

The homepage loads published stories through the public blog API and supports title search and pagination. Signed-in writers can create drafts, publish, edit, and delete their own stories from the dashboard and writing forms. The protected `/profile` page shows the current user's name, email, initials avatar, story counts, and separate draft/published lists. Display names can be edited; profile images are not uploaded because the project has no secure storage service. Blog detail pages use the API's ID-or-slug lookup; draft visibility and mutation ownership remain enforced by the API.

The interface uses the InkSpace editorial palette (Bone, Bottle Green, Pistachio, Warm Sand, and Cherry Red), system serif/sans-serif typography, keyboard-visible focus styles, and responsive navigation and layouts. Blog content is displayed as plain text with paragraph breaks rather than rendering user-submitted HTML.

## Checks

```powershell
npm run lint
npm run typecheck
npm run test:auth
npm run test:api
npx playwright test tests/frontend.spec.ts
npm run build
npm audit
```

The Playwright suites use `DATABASE_URL`, start or reuse the local Next.js server, and create isolated test accounts/stories that they clean up. Run them against a development/test database, not production data.

## Production and Vercel preparation

Before deploying:

1. Provision hosted PostgreSQL and configure `DATABASE_URL`, `NEXTAUTH_URL`, and `NEXTAUTH_SECRET` in the Vercel environment settings for the intended environment.
2. Set `NEXTAUTH_URL` to the canonical HTTPS origin and generate a strong random `NEXTAUTH_SECRET`. Production session cookies are secure; serve the app over HTTPS.
3. Ensure the Vercel build environment can reach the PostgreSQL host and that the configured connection string is supported by `pg` and Prisma migrations.
4. Apply committed migrations with `npm run db:deploy` as a release step before serving code that depends on the new schema. Do not run `prisma migrate dev` in production.
5. Build with `npm run build`; Prisma Client is generated during dependency installation. Vercel manages the production server process; for a self-hosted build, run `npm run start` after a successful build.

The application currently uses one `DATABASE_URL` for runtime queries and migrations. Some hosted providers require separate pooled-runtime and direct-migration URLs; that provider-specific setup is not currently configured and must be addressed before using such a provider.

## Current implementation scope

The Next.js App Router foundation, PostgreSQL schema and migrations, authentication, blog REST API, and editorial frontend are implemented. The current project does not include profile-image storage, rate limiting, or a hosted database configuration.
