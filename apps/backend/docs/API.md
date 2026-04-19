# FreeFlow Web2.5 Backend API

Base URL defaults to `http://localhost:8787`.

The backend is not the chain truth source. It stores creator workflow state, IPFS upload records, SIWE sessions, purchase history projections, and single-level comments. Published-track search is backed by `CreatorRelease`, not by a chain indexer.

Successful JSON responses:

```json
{ "ok": true, "data": {} }
```

Error responses:

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

Authenticated endpoints accept `Authorization: Bearer <sessionToken>` or the `ff_web25_session` cookie.

## Auth

### Issue SIWE Nonce

`POST /api/v1/auth/siwe/nonce`

```json
{
  "address": "0xC1b7D433c9175a8E5D8e399Ab4762B95e0035114",
  "chainId": 11155111
}
```

Returns SIWE message parameters: `nonce`, `domain`, `uri`, `statement`, `version`, and `expiresInSeconds`.

### Verify SIWE Signature

`POST /api/v1/auth/siwe/verify`

```json
{
  "message": "freeflow.local wants you to sign in with your Ethereum account:\n0x...\n\n...",
  "signature": "0x..."
}
```

Returns `{ sessionToken, session }`.

### Current Session

`GET /api/v1/auth/session`

Returns `{ authenticated, session }`.

### Logout

`POST /api/v1/auth/logout`

Revokes the current session and clears the session cookie.

## Users

All user endpoints require authentication.

### Get Current User

`GET /api/v1/users/me`

Returns display name, avatar URL, wallet address, chain id, and update time.

### Update Current User

`PATCH /api/v1/users/me`

```json
{
  "displayName": "FreeFlow Creator",
  "avatarUrl": "https://i.imgur.com/example.png"
}
```

### Upload Avatar

`POST /api/v1/users/me/avatar`

Multipart form-data:

| Field | Required | Description |
| --- | --- | --- |
| `file` | yes | Image file, max 10 MB |

The backend uploads the image to Imgur and stores the returned URL.

## Pinata Storage

### Read Config

`GET /api/v1/storage/pinata/config`

Public endpoint returning gateway, network, upload mode, and max file size.

### Upload File

`POST /api/v1/storage/pinata/files`

Requires authentication.

Multipart form-data:

| Field | Required | Description |
| --- | --- | --- |
| `file` | yes | File content uploaded through the backend to Pinata |
| `name` | no | Display name used on Pinata |
| `keyvalues` | no | JSON object string used as Pinata metadata |

Returns CID, backend `storageObjectId`, gateway URL, MIME type, and size.

## Releases

Release endpoints require authentication. A release belongs to the authenticated creator.

### List Creator Releases

`GET /api/v1/releases`

Returns dashboard summary and release records ordered by update time.

### Create Creator Release

`POST /api/v1/releases`

```json
{
  "title": "Track Title",
  "artistName": "Artist",
  "accessModel": "purchase"
}
```

`accessModel` is `open` or `purchase`.

### Get Release

`GET /api/v1/releases/:releaseId`

Returns a single release owned by the authenticated creator.

### Update Release

`PATCH /api/v1/releases/:releaseId`

The frontend uses this endpoint both for draft autosave and for explicit publish-result回写 after a Sepolia transaction is confirmed.

```json
{
  "title": "Track Title",
  "artistName": "Artist",
  "albumName": "Album",
  "genreLabel": "Pop",
  "description": "Description",
  "status": "PUBLISHED",
  "currentStage": "access",
  "accessModel": "purchase",
  "previewSeconds": 30,
  "priceEth": "0.01",
  "audioStorageObjectId": "cl...",
  "coverStorageObjectId": "cl...",
  "metadataStorageObjectId": "cl...",
  "chainId": 11155111,
  "chainName": "Sepolia",
  "explorerUrl": "https://sepolia.etherscan.io",
  "musicAssetAddress": "0x...",
  "platformHubAddress": "0x...",
  "splitterAddress": "0x...",
  "publishTxHash": "0x...",
  "publishBlockNumber": "123456",
  "tokenId": "1",
  "metadataDocument": {},
  "revenueSplits": [
    { "id": "primary", "label": "Primary artist", "address": "0x...", "share": 100 }
  ],
  "statusMessage": "Published token #1",
  "latestError": null
}
```

The backend does not sync a `Resource` table and does not follow chain events. Search reads published `CreatorRelease` rows.

### Delete Release

`DELETE /api/v1/releases/:releaseId`

Deletes the creator release and safe-to-delete local backend upload records.

## Published Track Search

These endpoints are public and keep the existing `/resources` path for desktop compatibility, but internally they query `CreatorRelease`.

### Search Published Tracks

`GET /api/v1/resources/search?q=<keyword>&limit=30`

Searches published releases by title, artist, album, genre, token id, metadata CID, or MusicAccess1155 address.

### Resolve Published Track

`GET /api/v1/resources/resolve?resourceKey=chain:11155111:0x...:1`

Returns one published track payload for desktop playback, download, and detail pages.

Important fields:

```json
{
  "resourceKey": "chain:11155111:0x...:1",
  "releaseId": "cl...",
  "title": "Track Title",
  "artistName": "Artist",
  "chainId": 11155111,
  "contractAddress": "0x...",
  "tokenId": "1",
  "audioUrl": "https://gateway.pinata.cloud/ipfs/bafy-audio",
  "audioCid": "bafy-audio",
  "coverUrl": "https://gateway.pinata.cloud/ipfs/bafy-cover",
  "metadataUrl": "https://gateway.pinata.cloud/ipfs/bafy-metadata",
  "accessModel": "purchase",
  "priceEth": "0.01",
  "platformHubAddress": "0x..."
}
```

### Metadata Lyrics Format

FreeFlow metadata stores lyrics under `properties.lyrics` as LRC 1.0 text:

```json
{
  "properties": {
    "lyrics": {
      "standard": "LRC",
      "version": "1.0",
      "language": "und",
      "synchronized": true,
      "text": "[00:00.00]First line\n[00:05.20]Second line"
    }
  }
}
```

Rules:

- `standard` must be `LRC`.
- `text` uses standard LRC timestamps in `[mm:ss.xx]` form.
- `language` uses BCP-47 when known, otherwise `und`.
- `synchronized=false` means the original source was plain unsynchronized text; the uploader generated valid LRC timestamps so the desktop lyric parser can still consume one format.

## Purchases

Purchase endpoints require authentication. The table is a projection/history only; ownership must still be checked on chain with `MusicAccess1155.balanceOf(user, tokenId)` or `PlatformHub.hasAccess(user, tokenId)`.

### Upsert Purchase

`POST /api/v1/purchases`

Called by the frontend after `PlatformHub.buyAccess()` is confirmed.

```json
{
  "releaseId": "cl...",
  "walletAddress": "0x...",
  "chainId": 11155111,
  "txHash": "0x...",
  "amountWei": "10000000000000000",
  "status": "confirmed",
  "purchasedAt": "2026-04-18T00:00:00.000Z"
}
```

Idempotency:

- `@@unique([chainId, txHashLower])`
- `@@unique([releaseId, walletAddressLower, chainId])`

## Comments

Comments are single-level backend records attached directly to `CreatorRelease`.

### List Comments

`GET /api/v1/comments?releaseId=<releaseId>&limit=30&cursor=<commentId>`

Public endpoint.

### Create Comment

`POST /api/v1/comments`

Requires authentication.

```json
{
  "releaseId": "cl...",
  "body": "Great track."
}
```

There are no replies, reactions, reports, moderation logs, or soft-delete states in this graduation-design version.

## System

### Health Check

`GET /api/v1/system/health`

Returns process and database health information.

## Scripts

### Publish Test Music

`pnpm --filter freeflow-web25-backend run publish:test-music -- <music-dir>`

The script reads `TEST_CREATOR_PRIVATE_KEY`, performs SIWE login, uploads MP3 assets through the storage API, creates release records, uploads metadata JSON, and prepares each release.

By default, it randomly selects 5 local MP3 files as `open` releases. All remaining tracks are `purchase` releases priced at `0.0005` Sepolia ETH. The paid price can be overridden with `TEST_TRACK_PRICE_ETH` or `--price-eth`, but the script refuses values that are zero or greater than `0.001`.

```bash
pnpm --filter freeflow-web25-backend run publish:test-music -- D:\Workplace\NodeProject\FreeFlow\TestMusicResouerces --price-eth 0.0005 --public-count 5
```

Use `--execute` to send Sepolia transactions through `PlatformHub.publishTrack` and patch the release to `PUBLISHED`.
