#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');
const defaultFilesApiBaseUrl = 'https://api.pinata.cloud/v3/files';
const confirmationValue = 'DELETE_ALL_PINATA_FILES';

function printHelp() {
  console.log(`
Delete every file visible to the configured Pinata JWT.

Usage:
  node apps/backend/scripts/delete-all-pinata-files.mjs --network all --yes
  node apps/backend/scripts/delete-all-pinata-files.mjs --network public --dry-run

Required for deletion:
  --yes
  PINATA_DELETE_ALL_CONFIRM=${confirmationValue}

Environment:
  PINATA_JWT                    Pinata JWT used for API calls.
  PINATA_FILES_API_BASE_URL     Optional. Defaults to ${defaultFilesApiBaseUrl}.

Options:
  --network public|private|all  Default: all.
  --limit <number>              Page size for listing. Default: 100.
  --delay-ms <number>           Delay between delete requests. Default: 100.
  --dry-run                     List matching files without deleting.
  --help                        Show this help.
`.trim());
}

async function loadEnvFile(filePath) {
  const content = await fs.readFile(filePath, 'utf8').catch(() => undefined);
  if (!content) return;

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const index = line.indexOf('=');
    if (index <= 0) continue;

    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
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

function parseArgs(argv) {
  const network = readOption(argv, '--network', 'all');
  const limit = Number(readOption(argv, '--limit', '100'));
  const delayMs = Number(readOption(argv, '--delay-ms', '100'));

  if (!['public', 'private', 'all'].includes(network)) {
    throw new Error('--network must be one of: public, private, all');
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 1000) {
    throw new Error('--limit must be an integer between 1 and 1000');
  }
  if (!Number.isInteger(delayMs) || delayMs < 0) {
    throw new Error('--delay-ms must be a non-negative integer');
  }

  return {
    network,
    limit,
    delayMs,
    dryRun: argv.includes('--dry-run'),
    yes: argv.includes('--yes'),
    help: argv.includes('--help') || argv.includes('-h'),
  };
}

function authHeaders(jwt) {
  return {
    Authorization: `Bearer ${jwt}`,
    Accept: 'application/json',
  };
}

function filesUrl(baseUrl, network, params = {}) {
  const url = new URL(`${baseUrl.replace(/\/$/, '')}/${network}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }
  return url;
}

async function readJson(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function responseErrorMessage(payload, status) {
  if (typeof payload === 'string' && payload.trim()) return payload.trim();
  return (
    payload?.error?.message ||
    payload?.error?.reason ||
    payload?.error?.code ||
    payload?.message ||
    `HTTP ${status}`
  );
}

async function requestJson(url, init = {}) {
  const response = await fetch(url, init);
  const payload = await readJson(response);

  if (!response.ok) {
    throw new Error(responseErrorMessage(payload, response.status));
  }
  return payload;
}

function extractItems(payload) {
  const candidates = [
    payload?.data?.files,
    payload?.data?.items,
    payload?.data?.rows,
    payload?.files,
    payload?.items,
    payload?.rows,
    payload?.data,
    payload,
  ];

  const items = candidates.find((candidate) => Array.isArray(candidate));
  return items ?? [];
}

function extractNextPageToken(payload) {
  return (
    payload?.data?.next_page_token ??
    payload?.data?.nextPageToken ??
    payload?.data?.next_page ??
    payload?.data?.nextPage ??
    payload?.next_page_token ??
    payload?.nextPageToken ??
    payload?.next_page ??
    payload?.nextPage ??
    null
  );
}

function fileId(file) {
  return file?.id ?? file?.file_id ?? file?.fileId ?? file?.pinata_id ?? file?.pinataId ?? null;
}

function fileLabel(file) {
  return file?.name ?? file?.filename ?? file?.keyvalues?.name ?? file?.cid ?? fileId(file) ?? 'unknown';
}

async function listFilesForNetwork({ baseUrl, jwt, network, limit }) {
  const files = [];
  const seenPageTokens = new Set();
  let pageToken = null;

  for (;;) {
    const params = { limit };
    if (pageToken) params.pageToken = pageToken;

    const payload = await requestJson(filesUrl(baseUrl, network, params), {
      method: 'GET',
      headers: authHeaders(jwt),
    });

    const pageFiles = extractItems(payload);
    files.push(...pageFiles);

    const nextPageToken = extractNextPageToken(payload);
    if (!nextPageToken || seenPageTokens.has(nextPageToken)) break;

    seenPageTokens.add(nextPageToken);
    pageToken = nextPageToken;
  }

  return files;
}

async function deleteFile({ baseUrl, jwt, network, id }) {
  const url = `${baseUrl.replace(/\/$/, '')}/${network}/${encodeURIComponent(id)}`;
  await requestJson(url, {
    method: 'DELETE',
    headers: authHeaders(jwt),
  });
}

async function sleep(ms) {
  if (ms > 0) await new Promise((resolve) => setTimeout(resolve, ms));
}

async function collectTargets(options) {
  const networks = options.network === 'all' ? ['public', 'private'] : [options.network];
  const targets = [];

  for (const network of networks) {
    console.log(`[pinata] Listing ${network} files...`);
    const files = await listFilesForNetwork({ ...options, network });
    console.log(`[pinata] Found ${files.length} ${network} files.`);

    for (const file of files) {
      const id = fileId(file);
      if (!id) {
        targets.push({ network, file, id: null, label: fileLabel(file) });
      } else {
        targets.push({ network, file, id, label: fileLabel(file) });
      }
    }
  }

  return targets;
}

async function main() {
  await loadEnvFile(path.join(repoRoot, '.env'));
  await loadEnvFile(path.join(repoRoot, 'apps/backend/.env'));

  const argv = process.argv.slice(2).filter((arg) => arg !== '--');
  const args = parseArgs(argv);
  if (args.help) {
    printHelp();
    return;
  }

  const jwt = process.env.PINATA_JWT;
  if (!jwt || jwt === 'replace-with-your-pinata-jwt') {
    throw new Error('PINATA_JWT is required.');
  }

  const baseUrl = process.env.PINATA_FILES_API_BASE_URL || defaultFilesApiBaseUrl;
  const options = { ...args, jwt, baseUrl };

  if (!args.dryRun && (!args.yes || process.env.PINATA_DELETE_ALL_CONFIRM !== confirmationValue)) {
    throw new Error(`Refusing to delete. Pass --yes and set PINATA_DELETE_ALL_CONFIRM=${confirmationValue}.`);
  }

  const targets = await collectTargets(options);
  const missingIds = targets.filter((target) => !target.id);
  const deletable = targets.filter((target) => target.id);

  if (missingIds.length > 0) {
    console.warn(`[pinata] ${missingIds.length} files did not expose an id and cannot be deleted by this script.`);
    for (const target of missingIds) {
      console.warn(`[pinata] Missing id: [${target.network}] ${target.label}`);
    }
  }

  if (args.dryRun) {
    console.log(`[pinata] Dry run only. ${deletable.length} files would be deleted.`);
    for (const target of deletable) {
      console.log(`[pinata] Would delete [${target.network}] ${target.id} ${target.label}`);
    }
    return;
  }

  console.log(`[pinata] Deleting ${deletable.length} files from Pinata...`);
  const failures = [];

  for (const target of deletable) {
    try {
      await deleteFile({ ...options, network: target.network, id: target.id });
      console.log(`[pinata] Deleted [${target.network}] ${target.id} ${target.label}`);
      await sleep(args.delayMs);
    } catch (error) {
      failures.push({ target, error });
      console.error(`[pinata] Failed [${target.network}] ${target.id}: ${error.message}`);
    }
  }

  if (failures.length > 0 || missingIds.length > 0) {
    console.error(`[pinata] Finished with ${failures.length} delete failures and ${missingIds.length} missing ids.`);
    process.exitCode = 1;
    return;
  }

  console.log('[pinata] All visible Pinata files were deleted.');
}

main().catch((error) => {
  console.error(`[pinata] ${error.message}`);
  process.exitCode = 1;
});
