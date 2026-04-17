# FreeFlow Web2.5 Backend API

Base URL defaults to `http://localhost:8787`.

All JSON endpoints use this envelope:

```json
{
  "ok": true,
  "data": {}
}
```

Errors use:

```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": {}
  }
}
```

Authenticated endpoints accept either:

```http
Authorization: Bearer <sessionToken>
```

or the `ff_web25_session` cookie issued by SIWE verification.

## Auth

### Issue SIWE Nonce

`POST /api/v1/auth/siwe/nonce`

Creates a one-time SIWE nonce bound to the optional wallet address and chain id.

Request:

```json
{
  "address": "0xC1b7D433c9175a8E5D8e399Ab4762B95e0035114",
  "chainId": 11155111
}
```

Response:

```json
{
  "ok": true,
  "data": {
    "nonce": "nonce-value",
    "domain": "freeflow.local",
    "uri": "https://freeflow.local/web2.5",
    "statement": "Sign in to FreeFlow Web2.5 services.",
    "version": "1",
    "expiresInSeconds": 300
  }
}
```

### Verify SIWE Signature

`POST /api/v1/auth/siwe/verify`

Verifies a signed SIWE message, creates or updates the wallet identity, and returns a session token.

Request:

```json
{
  "message": "freeflow.local wants you to sign in with your Ethereum account:\n0x...\n\n...",
  "signature": "0x..."
}
```

Response:

```json
{
  "ok": true,
  "data": {
    "sessionToken": "opaque-token",
    "session": {
      "sessionId": "cl...",
      "userId": "cl...",
      "walletIdentityId": "cl...",
      "address": "0x...",
      "chainId": 11155111,
      "domain": "freeflow.local",
      "uri": "https://freeflow.local/web2.5",
      "issuedAt": "2026-04-15T00:00:00.000Z",
      "verifiedAt": "2026-04-15T00:00:01.000Z",
      "expiresAt": "2026-04-22T00:00:01.000Z"
    }
  }
}
```

### Read Current Session

`GET /api/v1/auth/session`

Returns the current session if a valid bearer token or cookie is present.

### Logout

`POST /api/v1/auth/logout`

Revokes the current session token and clears the session cookie.

## Users

All user endpoints require authentication.

### Get Current User

`GET /api/v1/users/me`

Returns the web2.5 profile attached to the authenticated SIWE user.

### Update Current User

`PATCH /api/v1/users/me`

Request:

```json
{
  "displayName": "FreeFlow Creator",
  "avatarUrl": "https://i.imgur.com/example.png"
}
```

`displayName` may be an empty string to clear it. `avatarUrl` may be `null` or an empty string to clear it.

### Upload Avatar

`POST /api/v1/users/me/avatar`

Multipart form-data:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `file` | image file | yes | Avatar image, max 10 MB |

The backend uploads the image to Imgur using `IMGUR_CLIENT_ID`, stores the returned URL on the user, and returns the updated user profile.

## Pinata Storage

### Read Public Storage Config

`GET /api/v1/storage/pinata/config`

Public endpoint. Returns gateway, network, server-side upload mode and max file size.

### Upload File

`POST /api/v1/storage/pinata/files`

Requires authentication.

Multipart form-data:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `file` | file | yes | File content uploaded through the backend to Pinata |
| `name` | string | no | Display name used on Pinata |
| `keyvalues` | JSON object string | no | Pinata metadata key-values |

Response:

```json
{
  "ok": true,
  "data": {
    "cid": "bafy...",
    "id": "pinata-file-id",
    "storageObjectId": "cl...",
    "name": "track.mp3",
    "size": 12345,
    "mimeType": "audio/mpeg",
    "createdAt": "2026-04-15T00:00:00.000Z",
    "gatewayUrl": "https://gateway.pinata.cloud/ipfs/bafy..."
  }
}
```

## Releases

All release endpoints require authentication. A release belongs to the authenticated creator.

### List Creator Releases

`GET /api/v1/releases`

Returns dashboard summary and release records ordered by latest update.

### Create Creator Release

`POST /api/v1/releases`

Request:

```json
{
  "title": "Track Title",
  "artistName": "Artist",
  "accessModel": "open"
}
```

`accessModel` is `open` or `purchase`.

### Get Release

`GET /api/v1/releases/:releaseId`

Returns a single release owned by the authenticated creator.

### Update Release

`PATCH /api/v1/releases/:releaseId`

Main fields:

```json
{
  "title": "Track Title",
  "artistName": "Artist",
  "albumName": "Album",
  "genreLabel": "Pop",
  "description": "Description",
  "status": "METADATA_UPLOADED",
  "currentStage": "publish",
  "accessModel": "open",
  "previewSeconds": 30,
  "priceEth": "0.01",
  "royaltyBps": 1000,
  "audioStorageObjectId": "cl...",
  "coverStorageObjectId": "cl...",
  "metadataStorageObjectId": "cl...",
  "chainId": 11155111,
  "chainName": "sepolia",
  "explorerUrl": "https://sepolia.etherscan.io",
  "musicAssetAddress": "0x...",
  "royaltySplitterFactoryAddress": "0x...",
  "platformHubAddress": "0x...",
  "splitterAddress": "0x...",
  "publishTxHash": "0x...",
  "publishBlockNumber": "123456",
  "tokenId": "1",
  "metadataDocument": {},
  "royaltySplits": [
    { "id": "primary", "label": "Primary artist", "address": "0x...", "share": 100 }
  ],
  "activityEntry": {
    "message": "Metadata uploaded",
    "level": "success"
  }
}
```

When a release is updated to `PUBLISHED` with `chainId`, `musicAssetAddress` and `tokenId`, the backend syncs a searchable `Resource` record.

### Delete Release

`DELETE /api/v1/releases/:releaseId`

Deletes the creator release and related local backend storage records when safe.

## Resources

Resource endpoints are public and feed the desktop search/player.

### Search Published Tracks

`GET /api/v1/resources/search?q=<keyword>&limit=30`

Searches published track resources by title, artist, album, token id, CID, contract address or resource key.

### Resolve Published Track

`GET /api/v1/resources/resolve?resourceKey=chain:11155111:0x...:1`

Returns one published track resource. The response includes gateway URLs and CIDs used by desktop playback and download:

```json
{
  "ok": true,
  "data": {
    "resourceKey": "chain:11155111:0x...:1",
    "title": "Track Title",
    "artistName": "Artist",
    "audioUrl": "https://gateway.pinata.cloud/ipfs/bafy-audio",
    "audioCid": "bafy-audio",
    "coverUrl": "https://gateway.pinata.cloud/ipfs/bafy-cover",
    "coverCid": "bafy-cover",
    "metadataUrl": "https://gateway.pinata.cloud/ipfs/bafy-metadata",
    "metadataCid": "bafy-metadata"
  }
}
```

## Comments

Comment moderation is intentionally not implemented yet. Only published, non-deleted comments are shown.

### List Comments

`GET /api/v1/comments?resourceKey=<resourceKey>&limit=30&cursor=<commentId>`

Public endpoint. Lists top-level comments for a resource. Each item includes author display name, avatar URL, wallet address and up to five direct replies.

Response:

```json
{
  "ok": true,
  "data": {
    "resource": {
      "id": "cl...",
      "resourceKey": "chain:11155111:0x...:1",
      "type": "TRACK",
      "title": "Track Title"
    },
    "items": [
      {
        "id": "cl...",
        "resourceId": "cl...",
        "parentId": null,
        "body": "Great track.",
        "status": "PUBLISHED",
        "author": {
          "userId": "cl...",
          "displayName": "FreeFlow User",
          "avatarUrl": null,
          "walletAddress": "0x..."
        },
        "replies": [],
        "createdAt": "2026-04-15T00:00:00.000Z",
        "updatedAt": "2026-04-15T00:00:00.000Z"
      }
    ],
    "nextCursor": null
  }
}
```

### Create Comment

`POST /api/v1/comments`

Requires authentication.

Request:

```json
{
  "resourceKey": "chain:11155111:0x...:1",
  "body": "Great track.",
  "parentId": null
}
```

`parentId` is optional and must point to an existing published comment on the same resource.

## System

### Health Check

`GET /api/v1/system/health`

Returns service health information for basic runtime checks.

## Scripts

### Publish Test Music

`pnpm --filter freeflow-web25-backend run publish:test-music -- <music-dir>`

The script reads `TEST_CREATOR_PRIVATE_KEY` from the repository `.env`, performs SIWE login, uploads all MP3 files in the directory through the storage API, creates release records, uploads metadata JSON, and prepares each release.

Use `--execute` to send Sepolia transactions through `PlatformHub.publishTrack` and patch the release to `PUBLISHED`:

```bash
pnpm --filter freeflow-web25-backend run publish:test-music -- ../../TestMusicResouerces --execute
```

Required runtime assumptions:

| Variable | Description |
| --- | --- |
| `TEST_CREATOR_PRIVATE_KEY` | TestCreator wallet private key |
| `WEB25_BACKEND_URL` | Optional backend URL, defaults to `http://localhost:8787` |
| `SEPOLIA_RPC_URL` | Optional Sepolia RPC URL |
| backend `PINATA_JWT` | Backend must be configured for Pinata uploads |
