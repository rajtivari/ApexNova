# ApexNova

ApexFlow is a portfolio eSports tournament operations platform for Free Fire and BGMI. It is mock-only: payment, KYC, and game-room workflows do not connect to live providers.

## What's implemented

- [x] Monorepo foundation for `apps/api` and `apps/web`
- [x] Prisma schema covering identity, KYC, wallet, teams, tournaments, matches, disputes, referrals, notifications, and audit logs
- [x] JWT authentication boundary, four roles, and `moneyRouteGuard` for super-admin-only financial operations
- [x] Tournament listing and staff create/status management with Zod validation and audit logging
- [x] Standings service with a documented placeholder scoring table for tuning
- [x] Demo auth, match/result review, disputes, and super-admin mock deposits
- [x] Tactical role-switching dashboard shell for super admin, worker, captain, and player
- [x] PWA manifest and service worker

## Coming next

- [ ] Multer proof upload, entry fees, payouts, withdrawals, and referrals
- [ ] Complete role-specific routes and API-backed dashboard views
- [ ] Swagger JSDoc coverage for every route

## Run locally

```bash
npm install
npm --prefix apps/api install
npm --prefix apps/web install
cp apps/api/.env.example apps/api/.env
npm run db:generate
npm run dev
```

The web app runs on `http://localhost:3000`; the API runs on `http://localhost:4000`.

## Public web deployment

The web app is configured as a static export for GitHub Pages. In the repository settings, set **Pages > Build and deployment > Source** to **GitHub Actions**. Each push to `main` then publishes the dashboard at `https://rajtivari.github.io/ApexNova/`.

GitHub Pages hosts the frontend only. Deploy `apps/api` separately with a PostgreSQL database and set the frontend API URL when replacing the mock dashboard data.
