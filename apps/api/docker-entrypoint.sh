#!/bin/sh
# Prepare the database, then start the API.
set -e

if [ -d prisma/migrations ] && [ -n "$(ls -A prisma/migrations 2>/dev/null)" ]; then
  echo "[entrypoint] applying migrations"
  pnpm exec prisma migrate deploy
else
  # No migration files committed yet: create the tables straight from schema.prisma.
  # Fine for the very first deploy. Run `prisma migrate dev --name init` locally and commit
  # prisma/migrations before you change the schema later (see DEPLOY.md).
  echo "[entrypoint] no migrations found, using prisma db push"
  pnpm exec prisma db push --skip-generate
fi

exec node dist/server.js
