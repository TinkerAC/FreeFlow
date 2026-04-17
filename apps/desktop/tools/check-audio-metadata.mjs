#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { parseFile } from 'music-metadata';

const REQUIRED_FIELDS = [
  ['title', '标题'],
  ['artist', '艺术家'],
  ['genre', '流派'],
  ['lyrics', '歌词'],
];

const AUDIO_EXTENSIONS = new Set(['.mp3', '.flac', '.wav', '.ogg', '.m4a', '.aac']);

function usage() {
  console.log([
    'Usage: pnpm --filter freeflow run check:metadata -- <file-or-directory>',
    '',
    'Checks whether local audio files contain required upload metadata:',
    '- title',
    '- artist',
    '- genre',
    '- lyrics',
  ].join('\n'));
}

async function collectAudioFiles(inputPath) {
  const stat = await fs.stat(inputPath);
  if (stat.isFile()) {
    return AUDIO_EXTENSIONS.has(path.extname(inputPath).toLowerCase()) ? [inputPath] : [];
  }

  if (!stat.isDirectory()) return [];

  const entries = await fs.readdir(inputPath, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const fullPath = path.join(inputPath, entry.name);
    return entry.isDirectory()
      ? collectAudioFiles(fullPath)
      : Promise.resolve(AUDIO_EXTENSIONS.has(path.extname(entry.name).toLowerCase()) ? [fullPath] : []);
  }));
  return nested.flat();
}

function readText(value) {
  if (Array.isArray(value)) return value.join('\n').trim();
  return String(value ?? '').trim();
}

async function validateFile(filePath) {
  const metadata = await parseFile(filePath);
  const common = metadata.common;
  const normalized = {
    title: readText(common.title),
    artist: readText(common.artist),
    genre: Array.isArray(common.genre) ? common.genre.join(', ').trim() : readText(common.genre),
    lyrics: readText(common.lyrics),
  };

  const missing = REQUIRED_FIELDS
    .filter(([field]) => !normalized[field])
    .map(([, label]) => label);

  return {
    filePath,
    ok: missing.length === 0,
    missing,
    metadata: normalized,
  };
}

const target = process.argv.slice(2).find((arg) => arg !== '--');
if (!target || target === '-h' || target === '--help') {
  usage();
  process.exit(target ? 0 : 1);
}

const root = path.resolve(target);
const files = await collectAudioFiles(root);
if (!files.length) {
  console.error(`No supported audio files found: ${root}`);
  process.exit(1);
}

const results = [];
for (const file of files) {
  try {
    results.push(await validateFile(file));
  } catch (error) {
    results.push({
      filePath: file,
      ok: false,
      missing: ['读取失败'],
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

let failed = 0;
for (const result of results) {
  const relative = path.relative(process.cwd(), result.filePath);
  if (result.ok) {
    console.log(`[OK] ${relative}`);
  } else {
    failed += 1;
    const detail = result.error || `缺失：${result.missing.join('、')}`;
    console.log(`[FAIL] ${relative} - ${detail}`);
  }
}

console.log(`\nChecked ${results.length} file(s), ${failed} failed.`);
process.exit(failed > 0 ? 2 : 0);
