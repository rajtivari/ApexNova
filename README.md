# ApexNova

ApexNova is an eSports tournament operations platform for Free Fire and BGMI. The repository contains a Next.js static frontend, an Express API, and a PostgreSQL/Prisma data model.

**Manual UPI entry confirmation and private identity-review workflows are feature-gated.** UPI is verified by staff against the payment account; there is no payment-provider webhook. Identity images are encrypted in a configured private persistent directory and deleted after staff review. Do not enable either flow until the required registrations, operational controls, and hosting configuration are in place.

## Implemented

- Player registration and login with salted scrypt password hashes and short-lived JWTs.
- Server-issued roles; public registration can create player accounts only.
- Super-admin bootstrap script that reads credentials from environment variables.
- Team creation, roster membership, tournament listing and lifecycle controls.
- Tournament rules, player game UID/in-game name, and recorded rules acceptance on registration.\n- Free tournament registration with staff approval/rejection; paid entry can use a configured UPI QR and UTR reference with separate staff payment review.
- Match creation, team-scoped result submissions, staff result review, standings recalculation, and dispute resolution.
- User-scoped notifications, an approved-prize wallet ledger, super-admin prize credits, and UPI withdrawal requests with balance reservation and staff payout review.\n- Optional private identity and age review: encrypted selfie and masked Aadhaar images, admin-only access, deletion after review, and retention of the age-verification outcome only.
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


### Payments, prize wallet, and identity review

Paid entry is off by default. To enable manual UPI entry review, configure `PAYMENTS_ENABLED=true`, `ESPORTS_REGISTRATION_ID`, and `UPI_QR_URL` on the API. For the static frontend build, set `NEXT_PUBLIC_UPI_QR_URL` to the same public QR image. Players submit the UTR; staff must verify it against the payment account before approving the registration. Do not rely on a submitted UTR alone as proof of payment.

The wallet tracks approved prize credits and payout requests; it does not accept wallet top-ups. Players request withdrawals to a UPI ID, which is encrypted at rest. Staff send the payout separately, then mark it paid. Rejected requests return the reserved prize balance.

Identity upload is off by default. Enable it only after configuring `KYC_UPLOADS_ENABLED=true`, `UIDAI_OVSE_ID`, `KYC_PRIVATE_STORAGE_DIR` on a persistent private volume, and `DATA_ENCRYPTION_KEY` as a 32-byte hex key. Set the matching static build variable `NEXT_PUBLIC_KYC_UPLOADS_ENABLED=true`. Never point KYC storage at a public directory. The app accepts only a selfie and masked Aadhaar image, limits each image to 2 MB, encrypts files with AES-256-GCM, gives image access only to staff, and deletes both images after the decision. Staff visually confirm age from the Aadhaar image; the app retains only review status and an age-verified flag. Admin image review is manual; it does not verify UIDAI's signed QR credential.

Example key generation for a secure deployment: `openssl rand -hex 32`. Store the result in deployment secrets; do not commit it to Git. Use a private persistent storage volume with restricted access and backups appropriate for the retention period.

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
- TRUST_PROXY=true when the API host sits behind a single trusted reverse proxy; otherwise leave it false. This keeps IP-based authentication rate limits meaningful.

The API must be deployed and configured before login works on the public Pages site. Build the API container with `docker build -t apexnova-api ./apps/api`; configure its production environment and run the Prisma migrations as a deployment step before serving traffic. GitHub Actions verifies the code, clean-database migrations, and production image build, but it does not provision hosting or production secrets.
