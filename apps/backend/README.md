# FreeFlow Web2.5 Backend

Node.js backend for SIWE authentication and server-controlled Pinata uploads.

## Responsibilities

- SIWE nonce issuance and signature verification
- Opaque session management for desktop/web clients
- Server-side Pinata upload proxy
- Centralized control of Pinata JWT, gateway, network, and upload limits

## Quick start

1. Copy `.env.example` to `.env`.
2. Set `PINATA_JWT`.
3. Build and start:

```bash
pnpm --filter freeflow-web25-backend run build
pnpm --filter freeflow-web25-backend run start
```

The backend loads `apps/backend/.env` during startup before validating the environment schema.

## API

- `POST /api/v1/auth/siwe/nonce`
- `POST /api/v1/auth/siwe/verify`
- `GET /api/v1/auth/session`
- `POST /api/v1/auth/logout`
- `GET /api/v1/storage/pinata/config`
- `POST /api/v1/storage/pinata/files`
- `GET /api/v1/system/health`

`/api/v1/storage/pinata/files` requires an authenticated SIWE session.
