# ApexNova

ApexNova is an eSports tournament operations platform for Free Fire and BGMI. The repository contains a Next.js static frontend, an Express API, and a PostgreSQL/Prisma data model.

**Payments, KYC, proof uploads, and game-room integrations are not connected to live providers.** Wallet deposits are explicitly mock-only. Do not use this build to handle real money or sensitive identity documents.

## Implemented

- Player registration and login with salted scrypt password hashes and short-lived JWTs.
- Server-issued roles; public registration can create player accounts only.
- Super-admin bootstrap script that reads credentials from environment variables.
- Team creation, roster membership, tournament listing and lifecycle controls.
- Free tournament registration with staff approval/rejection.
- Match creation, team-scoped result submissions, staff result review, standings recalculation, and dispute resolution.
- User-scoped notifications and super-admin-only mock wallet operations.
- Audit logging, safe API error responses, production configuration checks, database health endpoint, and graceful shutdown.
- GitHub Actions checks for API syntax, unit tests, Prisma validation/client generation, and migrations against a clean PostgreSQL instance.
- GitHub Pages base-path and PWA fixes; frontend authentication and data views use the configured API rather than role-switching mock data.

## Local setup

Requirements: Node.js 20+, npm, and PostgreSQL.

1. Install dependencies:

   ~~~bash
   npm install
   npm --prefix apps/api ci
   npm --prefix apps/web ci
   ~~~

2. Configure the API by copying **apps/api/.env.example** to **apps/api/.env**. Set DATABASE_URL to your PostgreSQL database and set JWT_SECRET to a unique random value of at least 32 characters. Keep .env out of Git. For local web development, the API defaults to http://localhost:4000 if NEXT_PUBLIC_API_URL is not set.

3. Generate the Prisma client and apply migrations:

   ~~~bash
   npm run db:generate
   npm --prefix apps/api exec prisma migrate deploy
   ~~~

4. Create the first super-admin using environment variables; do not put the password in source code:

   ~~~bash
   ADMIN_EMAIL=admin@example.com ADMIN_DISPLAY_NAME="ApexNova Admin" ADMIN_PASSWORD="use-a-unique-password-of-12-or-more-characters" npm --prefix apps/api run admin:create
   ~~~

5. Start both apps:

   ~~~bash
   npm run dev
   ~~~

The web app runs at http://localhost:3000; the API runs at http://localhost:4000. The API health endpoint is /api/health.

## Database migration note

The initial migration creates the current base schema; subsequent migrations add audit/review timestamps and constraints. For a brand-new database, run prisma migrate deploy as shown above. If you already created tables with prisma db push before adopting migrations, do **not** blindly run the initial migration against that existing schema: back up the database and baseline the initial migration with Prisma's migrate resolve --applied procedure before deploying the additive migrations.

## GitHub Pages frontend deployment

The site is built for https://rajtivari.github.io/ApexNova/. In repository settings, select **Pages → Build and deployment → GitHub Actions**.

GitHub Pages hosts only the frontend; it cannot host the Express API or PostgreSQL. Deploy apps/api to a Node-capable host and provision PostgreSQL separately. Then add a repository Actions variable named NEXT_PUBLIC_API_URL with the deployed API origin (for example, https://api.example.com, without a trailing slash) and redeploy the frontend. Configure the API's CORS_ORIGINS to include https://rajtivari.github.io.

Production API environment variables:
- DATABASE_URL — production PostgreSQL connection string.
- JWT_SECRET — unique secret with at least 32 characters.
- CORS_ORIGINS — comma-separated list of exact allowed frontend origins.
- NODE_ENV=production.

The API must be deployed and configured before login works on the public Pages site. GitHub Actions verifies the code and clean-database migrations, but it does not provision hosting or production secrets.
