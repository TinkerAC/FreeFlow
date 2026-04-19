#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { Contract, JsonRpcProvider, parseEther, Wallet } from 'ethers';
import { parseFile, selectCover } from 'music-metadata';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');
const defaultMusicDir = path.join(repoRoot, 'TestMusicResouerces');
const defaultDeploymentFile = path.join(repoRoot, 'packages/contracts/deployments/sepolia-suite.json');
const defaultPublicTrackCount = 5;
const defaultPaidPriceEth = '0.0005';
const maxPaidPriceEth = '0.001';
const maxPaidPriceWei = 1_000_000_000_000_000n;
const ethDecimalPattern = /^(?:0|[1-9]\d*)(?:\.\d{1,18})?$/;
const lrcTimestampPattern = /\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/;

const PLATFORM_HUB_ABI = [
  'event TrackPublished(uint256 indexed tokenId, address indexed creator, address indexed payoutReceiver, bool requiresPurchase, bool active, uint256 price)',
  'function publishTrack(string tokenURI_, bool requiresPurchase, uint256 price, bool saleActive, address[] payees, uint256[] shares) returns (uint256 tokenId, address splitter)',
];

function loadEnvFile(filePath) {
  return fs.readFile(filePath, 'utf8')
    .then((content) => {
      for (const rawLine of content.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;
        const index = line.indexOf('=');
        if (index <= 0) continue;
        const key = line.slice(0, index).trim();
        const value = line.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
        if (key && process.env[key] === undefined) process.env[key] = value;
      }
    })
    .catch(() => undefined);
}

function buildSiweMessage(input) {
  return [
    `${input.domain} wants you to sign in with your Ethereum account:`,
    input.address,
    '',
    input.statement,
    '',
    `URI: ${input.uri}`,
    `Version: ${input.version}`,
    `Chain ID: ${input.chainId}`,
    `Nonce: ${input.nonce}`,
    `Issued At: ${input.issuedAt}`,
  ].join('\n');
}

function parseNameFromFile(filePath) {
  const base = path.basename(filePath, path.extname(filePath));
  const [artistPart, ...titleParts] = base.split(' - ');
  return {
    artist: artistPart?.trim() || '',
    title: titleParts.join(' - ').trim() || base.trim(),
  };
}

function readText(value) {
  if (Array.isArray(value)) return value.map((item) => String(item ?? '')).join('\n').trim();
  return String(value ?? '').trim();
}

function readLyrics(value) {
  const toLine = (item) => {
    if (typeof item === 'string') return item;
    if (item && typeof item === 'object' && typeof item.text === 'string') return item.text;
    return '';
  };
  if (Array.isArray(value)) {
    return value
      .map(toLine)
      .filter((line) => line.trim().length > 0)
      .join('\n')
      .trim();
  }
  return toLine(value).trim();
}

function readOption(argv, name, fallback) {
  const prefix = `${name}=`;
  const inline = argv.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);

  const index = argv.indexOf(name);
  if (index >= 0 && argv[index + 1] && !argv[index + 1].startsWith('--')) {
    return argv[index + 1];
  }
  return fallback;
}

function readPositionals(argv) {
  const optionsWithValue = new Set(['--price-eth', '--public-count']);
  const positionals = [];
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg.includes('=')) continue;
    if (optionsWithValue.has(arg)) {
      index += 1;
      continue;
    }
    if (arg.startsWith('--')) continue;
    positionals.push(arg);
  }
  return positionals;
}

function parseEthToWei(value) {
  const normalized = String(value ?? '').trim();
  if (!ethDecimalPattern.test(normalized)) return null;

  const [wholePart, decimalPart = ''] = normalized.split('.');
  const wholeWei = BigInt(wholePart) * 10n ** 18n;
  const fractionWei = BigInt((decimalPart + '0'.repeat(18)).slice(0, 18));
  return wholeWei + fractionWei;
}

function assertPaidPrice(priceEth) {
  const priceWei = parseEthToWei(priceEth);
  if (priceWei === null || priceWei <= 0n || priceWei > maxPaidPriceWei) {
    throw new Error(`Paid test tracks require 0 < price <= ${maxPaidPriceEth} Sepolia ETH`);
  }
}

function shuffle(values) {
  const next = [...values];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

function formatLrcTimestamp(timeMs) {
  const safeMs = Math.max(0, Math.round(timeMs));
  const totalSeconds = Math.floor(safeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const centiseconds = Math.floor((safeMs % 1000) / 10);
  return `[${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}]`;
}

function buildLyricsMetadata(lyricsText, durationSec) {
  const normalized = String(lyricsText ?? '').trim();
  if (!normalized) return null;

  if (lrcTimestampPattern.test(normalized)) {
    return {
      standard: 'LRC',
      version: '1.0',
      language: 'und',
      synchronized: true,
      text: normalized,
    };
  }

  const lines = normalized
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return null;

  const durationMs = typeof durationSec === 'number' && Number.isFinite(durationSec) && durationSec > 0
    ? Math.round(durationSec * 1000)
    : null;
  const intervalMs = durationMs && lines.length > 1
    ? Math.max(1000, Math.floor(durationMs / lines.length))
    : 5000;

  return {
    standard: 'LRC',
    version: '1.0',
    language: 'und',
    synchronized: false,
    text: lines.map((line, index) => `${formatLrcTimestamp(index * intervalMs)}${line}`).join('\n'),
  };
}

function mimeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.mp3') return 'audio/mpeg';
  if (ext === '.flac') return 'audio/flac';
  if (ext === '.wav') return 'audio/wav';
  if (ext === '.json') return 'application/json';
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.webp') return 'image/webp';
  return 'application/octet-stream';
}

async function collectAudioFiles(inputPath) {
  const entries = await fs.readdir(inputPath, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const fullPath = path.join(inputPath, entry.name);
    if (entry.isDirectory()) return collectAudioFiles(fullPath);
    return Promise.resolve(path.extname(entry.name).toLowerCase() === '.mp3' ? [fullPath] : []);
  }));
  return nested.flat();
}

async function apiRequest(baseUrl, token, pathName, init = {}) {
  const headers = new Headers(init.headers ?? {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}${pathName}`, {
    ...init,
    headers,
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.ok) {
    const message = payload?.error?.message || payload?.error?.code || `HTTP ${response.status}`;
    throw new Error(message);
  }
  return payload.data;
}

async function loginAsCreator(baseUrl, wallet, chainId) {
  const nonce = await apiRequest(baseUrl, null, '/api/v1/auth/siwe/nonce', {
    method: 'POST',
    body: JSON.stringify({
      address: wallet.address,
      chainId,
    }),
  });
  const message = buildSiweMessage({
    ...nonce,
    address: wallet.address,
    chainId,
    issuedAt: new Date().toISOString(),
  });
  const signature = await wallet.signMessage(message);
  return await apiRequest(baseUrl, null, '/api/v1/auth/siwe/verify', {
    method: 'POST',
    body: JSON.stringify({ message, signature }),
  });
}

async function uploadBuffer(baseUrl, token, input) {
  const formData = new FormData();
  formData.append('file', new Blob([new Uint8Array(input.buffer)], { type: input.mimeType }), input.filename);
  if (input.name) formData.append('name', input.name);
  if (input.keyvalues) formData.append('keyvalues', JSON.stringify(input.keyvalues));
  return await apiRequest(baseUrl, token, '/api/v1/storage/pinata/files', {
    method: 'POST',
    body: formData,
  });
}

async function listCreatorReleases(baseUrl, token) {
  const payload = await apiRequest(baseUrl, token, '/api/v1/releases');
  return payload.releases ?? [];
}

function buildMetadataDocument(input) {
  return {
    name: input.title,
    description: input.description,
    image: input.coverCid ? `ipfs://${input.coverCid}` : '',
    attributes: [
      { trait_type: 'Artist', value: input.artist },
      { trait_type: 'Album', value: input.album },
      { trait_type: 'Genre', value: input.genre },
      { trait_type: 'Access Model', value: input.accessModel },
    ],
    properties: {
      media: {
        audio: {
          uri: `ipfs://${input.audioCid}`,
          gateway: input.audioGatewayUrl,
          mimeType: input.audioMimeType,
          access: input.accessModel,
        },
        cover: input.coverCid
          ? {
            uri: `ipfs://${input.coverCid}`,
            gateway: input.coverGatewayUrl,
            mimeType: input.coverMimeType,
          }
          : null,
      },
      commerce: {
        unlockPriceEth: input.accessModel === 'purchase' ? input.priceEth : '0',
        platformHubAddress: input.platformHubAddress,
      },
      lyrics: input.lyrics,
      provenance: {
        storageProvider: 'Pinata',
        chainName: input.chainName,
        musicAssetAddress: input.musicAssetAddress,
      },
    },
  };
}

async function publishOnChain(input) {
  const provider = new JsonRpcProvider(input.rpcUrl);
  const wallet = input.wallet.connect(provider);
  const hub = new Contract(input.platformHubAddress, PLATFORM_HUB_ABI, wallet);
  const tx = await hub.publishTrack(
    input.metadataUri,
    input.accessModel === 'purchase',
    input.accessModel === 'purchase' ? parseEther(input.priceEth || '0') : 0n,
    true,
    [wallet.address],
    [100],
  );
  const receipt = await tx.wait();
  if (!receipt) throw new Error('Publish transaction receipt not found');

  let tokenId = null;
  let splitterAddress = null;
  for (const log of receipt.logs) {
    try {
      const parsed = hub.interface.parseLog(log);
      if (parsed?.name !== 'TrackPublished') continue;
      tokenId = parsed.args[0]?.toString?.() ?? null;
      splitterAddress = parsed.args[2] ?? null;
      break;
    } catch {
      // ignore unrelated logs
    }
  }
  if (!tokenId || !splitterAddress) {
    throw new Error('TrackPublished event not found in receipt');
  }

  return {
    txHash: tx.hash,
    blockNumber: receipt.blockNumber?.toString(),
    tokenId,
    splitterAddress,
  };
}

async function publishExistingReleases(input) {
  const releases = await listCreatorReleases(input.baseUrl, input.token);
  const targets = releases.filter((release) => (
    release.metadataStorageObject?.cid &&
    !release.tokenId
  ));

  console.log(`Found ${targets.length} existing metadata releases pending on-chain publish.`);

  for (const release of targets) {
    const accessModel = release.accessModel === 'purchase' ? 'purchase' : 'open';
    const priceEth = accessModel === 'purchase' ? release.priceEth : '0';
    if (accessModel === 'purchase') assertPaidPrice(priceEth);

    const metadataUri = `ipfs://${release.metadataStorageObject.cid}`;
    console.log(`[CHAIN] ${release.artistName || 'Unknown'} - ${release.title} (${accessModel}${accessModel === 'purchase' ? ` ${priceEth} ETH` : ''})`);

    await apiRequest(input.baseUrl, input.token, `/api/v1/releases/${release.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'PUBLISHING',
        currentStage: 'publish',
        statusMessage: 'Publishing existing metadata on chain',
        latestError: null,
      }),
    });

    try {
      const chainResult = await publishOnChain({
        wallet: input.wallet,
        rpcUrl: input.rpcUrl,
        platformHubAddress: input.platformHubAddress,
        metadataUri,
        accessModel,
        priceEth,
      });

      await apiRequest(input.baseUrl, input.token, `/api/v1/releases/${release.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'PUBLISHED',
          currentStage: 'access',
          publishTxHash: chainResult.txHash,
          publishBlockNumber: chainResult.blockNumber,
          tokenId: chainResult.tokenId,
          splitterAddress: chainResult.splitterAddress,
          musicAssetAddress: input.musicAccessAddress,
          platformHubAddress: input.platformHubAddress,
          statusMessage: `Published token #${chainResult.tokenId}`,
          activityEntry: {
            message: `Published token #${chainResult.tokenId}`,
            level: 'success',
          },
        }),
      });

      console.log(`[PUBLISHED] ${release.title} token=${chainResult.tokenId} tx=${chainResult.txHash}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await apiRequest(input.baseUrl, input.token, `/api/v1/releases/${release.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'FAILED',
          currentStage: 'publish',
          latestError: message,
          statusMessage: 'Existing metadata on-chain publish failed',
        }),
      }).catch(() => undefined);
      throw error;
    }
  }
}

async function main() {
  await loadEnvFile(path.join(repoRoot, '.env'));
  await loadEnvFile(path.join(repoRoot, 'apps/backend/.env'));

  const argv = process.argv.slice(2).filter((arg) => arg !== '--');
  const execute = argv.includes('--execute');
  const publishExisting = argv.includes('--publish-existing');
  const publicTrackCountRaw = Number(readOption(argv, '--public-count', String(defaultPublicTrackCount)));
  const publicTrackCount = Number.isInteger(publicTrackCountRaw) && publicTrackCountRaw >= 0
    ? publicTrackCountRaw
    : defaultPublicTrackCount;
  const paidPriceEth = readOption(argv, '--price-eth', process.env.TEST_TRACK_PRICE_ETH || defaultPaidPriceEth);
  assertPaidPrice(paidPriceEth);
  const musicDir = path.resolve(readPositionals(argv)[0] || defaultMusicDir);
  const baseUrl = process.env.WEB25_BACKEND_URL || 'http://localhost:8787';
  const rpcUrl = process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com';
  const creatorPrivateKey = process.env.TEST_CREATOR_PRIVATE_KEY;
  if (!creatorPrivateKey) throw new Error('TEST_CREATOR_PRIVATE_KEY is missing');

  const deployment = JSON.parse(await fs.readFile(defaultDeploymentFile, 'utf8'));
  const musicAccessAddress = deployment.contracts.musicAccess1155 || deployment.contracts.musicAsset;
  const chainId = Number(deployment.chainId || 11155111);
  const wallet = new Wallet(creatorPrivateKey.startsWith('0x') ? creatorPrivateKey : `0x${creatorPrivateKey}`);
  const files = await collectAudioFiles(musicDir);
  if (!files.length) throw new Error(`No MP3 files found: ${musicDir}`);
  const publicFiles = new Set(shuffle(files).slice(0, Math.min(publicTrackCount, files.length)));

  console.log(`Logging in as TestCreator ${wallet.address} against ${baseUrl}`);
  console.log(`Random public tracks: ${publicFiles.size}; paid price: ${paidPriceEth} Sepolia ETH`);
  const auth = await loginAsCreator(baseUrl, wallet, chainId);
  const token = auth.sessionToken;

  if (publishExisting) {
    await publishExistingReleases({
      baseUrl,
      token,
      wallet,
      rpcUrl,
      platformHubAddress: deployment.contracts.platformHub,
      musicAccessAddress,
    });
    return;
  }

  for (const filePath of files) {
    const metadata = await parseFile(filePath);
    const fromName = parseNameFromFile(filePath);
    const title = readText(metadata.common.title) || fromName.title;
    const artist = readText(metadata.common.artist) || fromName.artist;
    const album = readText(metadata.common.album) || title;
    const genre = Array.isArray(metadata.common.genre) && metadata.common.genre.length
      ? metadata.common.genre.join(', ')
      : 'Pop';
    const lyrics = readLyrics(metadata.common.lyrics);
    const accessModel = publicFiles.has(filePath) ? 'open' : 'purchase';
    const priceEth = accessModel === 'purchase' ? paidPriceEth : '0';
    if (!title || !artist || !genre || !lyrics) {
      console.log(`[SKIP] ${path.basename(filePath)} missing required metadata`);
      continue;
    }

    console.log(`[UPLOAD] ${artist} - ${title} (${accessModel}${accessModel === 'purchase' ? ` ${priceEth} ETH` : ''})`);
    const audioBuffer = await fs.readFile(filePath);
    const audioUpload = await uploadBuffer(baseUrl, token, {
      buffer: audioBuffer,
      filename: path.basename(filePath),
      name: `${artist} - ${title}`,
      mimeType: mimeFor(filePath),
      keyvalues: { kind: 'audio', artist, title },
    });

    const cover = selectCover(metadata.common.picture);
    let coverUpload = null;
    if (cover) {
      const coverExt = cover.format.includes('png') ? '.png' : '.jpg';
      coverUpload = await uploadBuffer(baseUrl, token, {
        buffer: Buffer.from(cover.data),
        filename: `${path.basename(filePath, path.extname(filePath))}-cover${coverExt}`,
        name: `${artist} - ${title} cover`,
        mimeType: cover.format,
        keyvalues: { kind: 'cover', artist, title },
      });
    }

    const release = await apiRequest(baseUrl, token, '/api/v1/releases', {
      method: 'POST',
      body: JSON.stringify({
        title,
        artistName: artist,
        accessModel,
      }),
    });

    const metadataDocument = buildMetadataDocument({
      title,
      artist,
      album,
      genre,
      lyrics: buildLyricsMetadata(lyrics, metadata.format.duration),
      description: `Published from TestMusicResouerces: ${path.basename(filePath)}`,
      accessModel,
      priceEth,
      audioCid: audioUpload.cid,
      audioGatewayUrl: audioUpload.gatewayUrl,
      audioMimeType: audioUpload.mimeType,
      coverCid: coverUpload?.cid ?? null,
      coverGatewayUrl: coverUpload?.gatewayUrl ?? null,
      coverMimeType: coverUpload?.mimeType ?? null,
      chainName: deployment.network,
      musicAssetAddress: musicAccessAddress,
      platformHubAddress: deployment.contracts.platformHub,
    });

    const metadataBuffer = Buffer.from(JSON.stringify(metadataDocument, null, 2), 'utf8');
    const metadataUpload = await uploadBuffer(baseUrl, token, {
      buffer: metadataBuffer,
      filename: `${release.slug || release.id}-metadata.json`,
      name: `${artist} - ${title} metadata`,
      mimeType: 'application/json',
      keyvalues: { kind: 'metadata', releaseId: release.id, artist, title },
    });

    await apiRequest(baseUrl, token, `/api/v1/releases/${release.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        title,
        artistName: artist,
        albumName: album,
        genreLabel: genre,
        status: 'METADATA_UPLOADED',
        currentStage: execute ? 'publish' : 'storage',
        accessModel,
        priceEth,
        audioSourceName: path.basename(filePath),
        audioStorageObjectId: audioUpload.storageObjectId,
        coverStorageObjectId: coverUpload?.storageObjectId ?? null,
        metadataStorageObjectId: metadataUpload.storageObjectId,
        metadataDocument,
        chainId,
        chainName: deployment.network,
        explorerUrl: 'https://sepolia.etherscan.io',
        musicAssetAddress: musicAccessAddress,
        platformHubAddress: deployment.contracts.platformHub,
        revenueSplits: [{ id: 'test-creator', label: 'TestCreator', address: wallet.address, share: 100 }],
        statusMessage: execute ? 'Metadata uploaded; publishing on chain' : 'Metadata uploaded',
      }),
    });

    if (!execute) {
      console.log(`[READY] ${title} release=${release.id} metadata=ipfs://${metadataUpload.cid}`);
      continue;
    }

    const chainResult = await publishOnChain({
      wallet,
      rpcUrl,
      platformHubAddress: deployment.contracts.platformHub,
      metadataUri: `ipfs://${metadataUpload.cid}`,
      accessModel,
      priceEth,
    });

    await apiRequest(baseUrl, token, `/api/v1/releases/${release.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'PUBLISHED',
        currentStage: 'access',
        publishTxHash: chainResult.txHash,
        publishBlockNumber: chainResult.blockNumber,
        tokenId: chainResult.tokenId,
        splitterAddress: chainResult.splitterAddress,
        statusMessage: `Published token #${chainResult.tokenId}`,
        activityEntry: {
          message: `Published token #${chainResult.tokenId}`,
          level: 'success',
        },
      }),
    });

    console.log(`[PUBLISHED] ${title} token=${chainResult.tokenId} tx=${chainResult.txHash}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
