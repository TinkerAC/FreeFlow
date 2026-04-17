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

const PLATFORM_HUB_ABI = [
  'event TrackPublished(uint256 indexed tokenId, address indexed creator, address indexed payoutReceiver, bool requiresPurchase, bool active, uint256 price, uint96 royaltyBps)',
  'function publishTrack(string tokenURI_, uint96 royaltyBps, bool requiresPurchase, uint256 price, bool saleActive, address[] payees, uint256[] shares) returns (uint256 tokenId, address splitter)',
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
      { trait_type: 'Royalty BPS', value: input.royaltyBps },
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
    input.royaltyBps,
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

async function main() {
  await loadEnvFile(path.join(repoRoot, '.env'));
  await loadEnvFile(path.join(repoRoot, 'apps/backend/.env'));

  const argv = process.argv.slice(2).filter((arg) => arg !== '--');
  const execute = argv.includes('--execute');
  const musicDir = path.resolve(argv.find((arg) => !arg.startsWith('--')) || defaultMusicDir);
  const baseUrl = process.env.WEB25_BACKEND_URL || 'http://localhost:8787';
  const rpcUrl = process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com';
  const creatorPrivateKey = process.env.TEST_CREATOR_PRIVATE_KEY;
  if (!creatorPrivateKey) throw new Error('TEST_CREATOR_PRIVATE_KEY is missing');

  const deployment = JSON.parse(await fs.readFile(defaultDeploymentFile, 'utf8'));
  const chainId = Number(deployment.chainId || 11155111);
  const wallet = new Wallet(creatorPrivateKey.startsWith('0x') ? creatorPrivateKey : `0x${creatorPrivateKey}`);
  const files = await collectAudioFiles(musicDir);
  if (!files.length) throw new Error(`No MP3 files found: ${musicDir}`);

  console.log(`Logging in as TestCreator ${wallet.address} against ${baseUrl}`);
  const auth = await loginAsCreator(baseUrl, wallet, chainId);
  const token = auth.sessionToken;

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
    if (!title || !artist || !genre || !lyrics) {
      console.log(`[SKIP] ${path.basename(filePath)} missing required metadata`);
      continue;
    }

    console.log(`[UPLOAD] ${artist} - ${title}`);
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
        accessModel: 'open',
      }),
    });

    const metadataDocument = buildMetadataDocument({
      title,
      artist,
      album,
      genre,
      lyrics,
      description: `Published from TestMusicResouerces: ${path.basename(filePath)}`,
      accessModel: 'open',
      royaltyBps: 1000,
      audioCid: audioUpload.cid,
      audioGatewayUrl: audioUpload.gatewayUrl,
      audioMimeType: audioUpload.mimeType,
      coverCid: coverUpload?.cid ?? null,
      coverGatewayUrl: coverUpload?.gatewayUrl ?? null,
      coverMimeType: coverUpload?.mimeType ?? null,
      chainName: deployment.network,
      musicAssetAddress: deployment.contracts.musicAsset,
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
        accessModel: 'open',
        royaltyBps: 1000,
        audioSourceName: path.basename(filePath),
        audioStorageObjectId: audioUpload.storageObjectId,
        coverStorageObjectId: coverUpload?.storageObjectId ?? null,
        metadataStorageObjectId: metadataUpload.storageObjectId,
        metadataDocument,
        chainId,
        chainName: deployment.network,
        explorerUrl: 'https://sepolia.etherscan.io',
        musicAssetAddress: deployment.contracts.musicAsset,
        royaltySplitterFactoryAddress: deployment.contracts.royaltySplitterFactory,
        platformHubAddress: deployment.contracts.platformHub,
        royaltySplits: [{ id: 'test-creator', label: 'TestCreator', address: wallet.address, share: 100 }],
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
      royaltyBps: 1000,
      accessModel: 'open',
      priceEth: '0',
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
