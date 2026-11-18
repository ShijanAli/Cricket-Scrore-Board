# Deploy the API and build the Android APK

Order matters: the APK needs a **public HTTPS address** for the API, so deploy the API first.

## 1. Create the database migration (once, on your computer)

The repo has `prisma/schema.prisma` but no migration files yet. Create them so future schema changes are safe:

```bash
docker compose up -d                                  # local Postgres
cp apps/api/.env.example apps/api/.env
cd apps/api && pnpm prisma migrate dev --name init    # creates apps/api/prisma/migrations
```

Commit `apps/api/prisma/migrations`. If you skip this, the container falls back to `prisma db push` on start,
which is fine for the first deploy only.

## 2. Deploy the API

### Option A: one VPS (Docker Compose + automatic HTTPS)

Any Linux VPS with Docker (DigitalOcean, Hetzner, Vultr...). You need a domain or free subdomain (for example
DuckDNS) with an **A record pointing to the server's IP**. Ports 80 and 443 must be open.

```bash
git clone <your repo> && cd cricket-app
cp .env.prod.example .env.prod        # set DOMAIN, POSTGRES_PASSWORD, and both JWT secrets
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
curl https://YOUR_DOMAIN/health       # should answer ok
```

Update later: `git pull && docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build`.
Back up the `pgdata` volume (for example a nightly `pg_dump`).

### Option B: Railway or Render (no server to manage)

1. New project from your GitHub repo, choose **Dockerfile** (root `Dockerfile`).
2. Add a PostgreSQL database and set `DATABASE_URL` on the API service to its connection string.
3. Set `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` (32+ random characters each), `NODE_ENV=production`.
4. Open the generated `https://...` URL + `/health`.

WebSockets work on both. Keep **one** API instance: live updates use in-memory rooms, so scaling to several
instances needs a Socket.io adapter (Redis) first.

## 3. Build the APK (Expo EAS)

You need a free Expo account and the repo in git (EAS uploads from git).

```bash
npm i -g eas-cli
eas login
cd apps/mobile
eas init                      # links the app to your Expo account (adds projectId to app.json)
```

Edit `apps/mobile/eas.json` and replace both `https://CHANGE-ME.example.com` with your API address
(no trailing slash, **https**). Then:

```bash
eas build -p android --profile preview      # builds an .apk you can install directly
```

EAS prints a download link and a QR code. Open it on the phone, install the APK (allow "install unknown apps").
Check the **Account** tab: "Server:" must show your API address.

Notes:
- **HTTPS is required.** Release builds of Android 9+ block plain `http://`. Use the domain from step 2.
- The app id is `com.cricketscore.app` (`apps/mobile/app.json`). Change it before publishing to the Play Store if
  you want your own, and do it before the first store upload (it cannot change later).
- Play Store: `eas build -p android --profile production` makes an `.aab`; `eas submit -p android` uploads it
  (needs a Google Play developer account).
- The `eas-build-post-install` script in `apps/mobile/package.json` builds the shared packages on the EAS server.
  Without it the bundle fails because `@cricket/shared` and `@cricket/engine` have no `dist` folder there.

## Quick checks if something fails

| Symptom | Likely cause |
| --- | --- |
| App says "No connection" | `EXPO_PUBLIC_API_URL` wrong or `http://`; open `https://API/health` in the phone browser |
| Container restarts | `docker compose logs api`: usually a JWT secret shorter than 32 characters |
| Login works, live score never updates | proxy blocks WebSockets (Caddy and Railway/Render allow them by default) |
| EAS build: "Cannot find module @cricket/shared" | `eas-build-post-install` script missing or the repo root was not uploaded (run from `apps/mobile` inside a git repo) |

## Web app (`apps/web`)

React + Vite + Tailwind + shadcn/ui + Redux Toolkit. Public viewer, organiser dashboard and web scoring (offline outbox in IndexedDB).

Local: `cp apps/web/.env.example apps/web/.env`, set `VITE_API_URL`, then `pnpm --filter @cricket/web dev`.

Vercel: create a project with **Root Directory = `apps/web`** (it uses `apps/web/vercel.json`), and set:

| Variable | Value |
| --- | --- |
| `VITE_API_URL` | your API URL, `https://...` |
| `VITE_ENABLE_SOCKET` | `false` on Vercel serverless API, `true` on a long-running server |

Also add the web URL to the API `CORS_ORIGIN`.

Socket.io does not work on Vercel serverless functions. With `VITE_ENABLE_SOCKET=false` (or when the socket is disconnected) the web app polls every 10 s. For true realtime, host the API on a long-running server (Railway/Render/VPS).
