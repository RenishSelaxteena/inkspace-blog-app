# InkSpace

InkSpace is a full-stack editorial blogging application built with Next.js App Router, TypeScript, Tailwind CSS, PostgreSQL 17, Prisma, NextAuth Credentials, bcryptjs, Zod, and React Hook Form.

It provides a space for readers to discover stories and for authenticated writers to create, publish, and manage their own content through a thoughtfully designed editorial interface.

## Features

- Register and sign in with email and password; passwords are stored as bcrypt hashes.
- Browse, search, and paginate published stories.
- Create drafts, publish, edit, and delete your own stories.
- View private drafts only when signed in as their author.
- Manage your display name and review your published stories and drafts.
- Responsive editorial UI with client-side and server-side validation and accessible feedback.

## Technology Stack

- **Frontend:** Next.js App Router, React, TypeScript, Tailwind CSS 4.
- **Database:** PostgreSQL 17.
- **ORM:** Prisma 7.
- **Authentication:** NextAuth v4 Credentials with JWT sessions.
- **Security and validation:** bcryptjs and Zod.
- **Forms:** React Hook Form.
- **Testing:** Playwright.

## Architecture and Project Structure

The UI uses Server Components for protected page checks and Client Components for interactive forms and API-backed lists.

Next.js Route Handlers manage validation, authentication, and authorization. Prisma queries derive ownership from the verified server session.

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
- PostgreSQL 17

## Local Setup

### 1. Create the database

Create a local PostgreSQL database named `inkspace`.

For example, from `psql`:

```sql
CREATE DATABASE inkspace;
```

### 2. Configure environment variables

Copy `.env.example` to `.env`:

```powershell
Copy-Item .env.example .env
```

Update the database username and password with your local PostgreSQL credentials.

Generate a secure local secret using:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

Use the generated value for `NEXTAUTH_SECRET`.

Keep `.env` private. It is excluded from Git.

### 3. Install dependencies

```powershell
npm install
```

The `postinstall` script automatically generates the Prisma Client.

### 4. Apply database migrations

```powershell
npm run db:deploy
```

### 5. Start the development server

```powershell
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable          | Purpose                                                                |
| ----------------- | ---------------------------------------------------------------------- |
| `DATABASE_URL`    | PostgreSQL connection string used by Prisma and migrations.            |
| `NEXTAUTH_URL`    | Canonical application origin, such as `http://localhost:3000` locally. |
| `NEXTAUTH_SECRET` | Random secret used to sign and encrypt NextAuth JWT session cookies.   |

`.env.example` contains placeholders only.

Use separate credentials and a strong, unique secret for each deployed environment. Never commit `.env`.

## Prisma and Database Migrations

Prisma is configured for PostgreSQL. The `User` and `Blog` models and their migration history are stored in:

- `prisma/schema.prisma`
- `prisma/migrations/`

### Create a development migration

After changing the Prisma schema:

```powershell
npx prisma migrate dev --name <migration_name>
```

### Apply committed migrations

```powershell
npm run db:deploy
```

### Regenerate the Prisma Client

```powershell
npm run db:generate
```

Do not use `prisma db push` as a replacement for migrations in this project.

The Prisma Client is also generated automatically during `npm install` or `npm ci` through the `postinstall` script. This is required because `src/generated/prisma` is generated locally and excluded from Git.

### User and Blog Deletion

Each blog references its author through a PostgreSQL foreign key with `ON DELETE RESTRICT`.

PostgreSQL rejects deletion of a user who still has blogs, preserving those blog records.

The migration that sets this rule changes only the foreign-key constraint; it does not delete or update existing user or blog records.

## Authentication

Registration is handled by `POST /api/register`.

It validates the name, normalized email, password, and confirmation, rejects duplicate email addresses, and stores a bcryptjs password hash. Responses never include the password hash.

Login and logout use the NextAuth v4 Credentials provider.

Sessions use JWTs, and the server-side session includes the authenticated user ID. Session cookies are HTTP-only and secure in production.

`getCurrentUser()` verifies the session ID against the user record. Database errors are not treated as anonymous sessions.

`requireAuth()` protects the dashboard, profile, create, and edit pages and preserves the intended destination through login.

## Blog REST API

| Method and path                         | Access         | Behavior                                                                                                                        |
| --------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/blogs?page=1&limit=10&q=term` | Public         | Lists published blogs only; supports title search and pagination.                                                               |
| `GET /api/blogs/[id]`                   | Public / owner | Accepts either a blog ID or slug. Published blogs are public; only the author can view drafts. Unavailable drafts return `404`. |
| `POST /api/blogs`                       | Authenticated  | Creates a draft or published blog. The server assigns the author and generates a unique slug.                                   |
| `PUT /api/blogs/[id]`                   | Owner          | Updates the blog, changes its slug if the title changes, and maintains publication timestamps.                                  |
| `DELETE /api/blogs/[id]`                | Owner          | Deletes the blog and returns `204` with no response body.                                                                       |
| `GET /api/users/me/blogs`               | Authenticated  | Lists only the current user's drafts and published blogs.                                                                       |
| `GET /api/users/me`                     | Authenticated  | Returns the current user's profile and total, published, and draft counts.                                                      |
| `PATCH /api/users/me`                   | Authenticated  | Updates only the current user's validated display name.                                                                         |

Successful JSON responses use:

```json
{
  "data": {}
}
```

Error responses use:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Description of the error",
    "fields": {}
  }
}
```

The `fields` property is included when validation details apply.

Blog mutations are validated on the server. Ownership is derived from the verified Auth.js session, never from a request-supplied `authorId`.

## Frontend

The homepage loads published stories through the public blog API and supports title search and pagination.

Authenticated writers can create drafts, publish, edit, and delete their own stories through the dashboard and writing forms.

The protected `/profile` page displays:

- User's name and email.
- Initials-based avatar.
- Story statistics.
- Separate draft and published story lists.

Users can edit their display names. Profile image uploads are not implemented because the project does not currently have a secure image-storage service.

Blog detail pages use the API's ID-or-slug lookup. Draft visibility and mutation ownership remain enforced by the API.

### Design

InkSpace uses an editorial colour palette:

- **Bone**
- **Bottle Green**
- **Pistachio**
- **Warm Sand**
- **Cherry Red**

The interface uses serif and sans-serif typography, keyboard-visible focus styles, responsive navigation, and carefully structured layouts.

Blog content is displayed as plain text with paragraph breaks rather than rendering user-submitted HTML.

## Testing and Quality Checks

Run the following commands from the project directory:

```powershell
npm run lint
npm run typecheck
npm run test:auth
npm run test:api
npx playwright test tests/frontend.spec.ts
npm run build
npm audit
```

The Playwright suites use `DATABASE_URL`, start or reuse the local Next.js server, and create isolated test accounts and stories that they clean up.

Run these tests against a development or test database, not production data.

## Production and Vercel Preparation

Before deploying:

1. Provision a hosted PostgreSQL database.
2. Configure `DATABASE_URL`, `NEXTAUTH_URL`, and `NEXTAUTH_SECRET` in Vercel environment settings.
3. Set `NEXTAUTH_URL` to the canonical HTTPS application origin.
4. Generate a strong, unique `NEXTAUTH_SECRET`.
5. Ensure the build environment can reach the PostgreSQL host and that the connection string is supported by `pg` and Prisma migrations.
6. Apply committed migrations using `npm run db:deploy` before serving code that depends on the updated schema.
7. Build the application using `npm run build`.

Do not run `prisma migrate dev` in production.

Prisma Client is generated during dependency installation. Vercel manages the production server process. For a self-hosted build, run:

```powershell
npm run start
```

after a successful production build.

### Database Connection Considerations

The application currently uses one `DATABASE_URL` for runtime queries and migrations.

Some hosted PostgreSQL providers require separate pooled runtime and direct migration URLs. That provider-specific configuration is not currently implemented and must be addressed before using such a provider.

## Current Implementation Scope

The following are implemented:

- Next.js App Router foundation.
- PostgreSQL schema and migrations.
- Authentication and session management.
- Blog REST API and ownership authorization.
- Responsive editorial frontend.
- User profile and writing dashboard.
- Automated authentication, API, and frontend tests.

The current project does not include:

- Profile-image storage.
- Distributed rate limiting.
- Hosted database configuration.

These are identified as future production-hardening tasks.
