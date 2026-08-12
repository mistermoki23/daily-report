# Campaign Monitor

Daily advertising campaign monitoring (Plan vs Fact) — Next.js + Prisma + PostgreSQL.

## Local development

```bash
npm install
cp .env.example .env.local
# Keep USE_LOCAL_DB=true for JSON demo store, or set DATABASE_URL for Postgres
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Login accepts any email/password (demo auth cookie).

## PostgreSQL

```bash
# Docker
docker compose up -d

# Or embedded (no Docker): npm run db:pg

# Then in .env / .env.local:
# DATABASE_URL=...
# USE_LOCAL_DB=false

npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server |
| `npm run build` | Prisma generate + Next.js production build |
| `npm run start` | Start production server |
| `npm run db:migrate` | Apply migrations (dev) |
| `npm run db:seed` | Seed Abbott / BYYD / Brufen demo |

## Environment

See `.env.example`. Never commit `.env` / `.env.local`.
