# FreeFlow Web2.5 Backend

Node.js backend for SIWE authentication and server-controlled Pinata uploads.

## Responsibilities

- SIWE nonce issuance and signature verification
- PostgreSQL-backed users, wallet identities, SIWE nonces, and sessions
- Server-side Pinata upload proxy
- Persistent storage metadata for uploaded Pinata objects
- Foundation tables for resources, comments, reactions, reports, and moderation logs

## Quick start

1. Copy `.env.example` to `.env`.
2. Set `DATABASE_URL` and `PINATA_JWT`.
3. Generate the Prisma client and apply migrations.
4. Build and start:

```bash
docker compose -f apps/backend/docker-compose.postgres.yml up -d
pnpm --filter freeflow-web25-backend run prisma:generate
pnpm --filter freeflow-web25-backend run prisma:migrate:dev
pnpm --filter freeflow-web25-backend run build
pnpm --filter freeflow-web25-backend run start
```

The backend loads `apps/backend/.env` during startup before validating the environment schema.

## Logging

Logs are emitted as structured JSON with a `scope` field. Use `LOG_LEVEL` to control verbosity (`fatal`, `error`, `warn`, `info`, `debug`, `trace`, or `silent`). Set `LOG_PRISMA_QUERIES=true` only when debugging database SQL, because query parameters can contain sensitive data.

## Data model

Prisma schema lives in `apps/backend/prisma/schema.prisma`.

Core persisted entities:

- `User`
- `WalletIdentity`
- `SiweNonce`
- `AuthSession`
- `StorageObject`
- `Resource`
- `Comment`
- `CommentReaction`
- `CommentReport`
- `CommentModerationLog`

## API

- `POST /api/v1/auth/siwe/nonce`
- `POST /api/v1/auth/siwe/verify`
- `GET /api/v1/auth/session`
- `POST /api/v1/auth/logout`
- `GET /api/v1/storage/pinata/config`
- `POST /api/v1/storage/pinata/files`
- `GET /api/v1/system/health`

`/api/v1/storage/pinata/files` requires an authenticated SIWE session.
