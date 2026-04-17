#!/usr/bin/env node
const fs = require('node:fs/promises');
const path = require('node:path');
const process = require('node:process');

const projectRoot = path.resolve(__dirname, '..');
require('./register-ts-paths.cjs')(projectRoot);
process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({
  module: 'CommonJS',
  moduleResolution: 'node',
});
require('ts-node/register/transpile-only');

const { LyricService } = require('../src/main/services/LyricService');
const NetEaseCloudMusic = require('../src/main/contentProvider/NetEaseCloudMusic/NetEaseCloudMusic').default;
const { QQMusic } = require('../src/main/contentProvider/QQMusic/QQMusic');
const { Platform } = require('../src/main/core/enum/Platform');

const AUDIO_EXTENSIONS = new Set(['.mp3']);
const DEFAULT_RESOURCE_DIR = path.resolve(projectRoot, '..', '..', 'TestMusicResouerces');

const logger = {
  info: () => undefined,
  warn: (...args) => console.warn('[lyrics]', ...args),
  error: (...args) => console.error('[lyrics]', ...args),
  debug: () => undefined,
};

const configService = {
  get: () => ({}),
};

let musicMetadataModule = null;

async function getMusicMetadata() {
  if (!musicMetadataModule) {
    musicMetadataModule = await import('music-metadata');
  }
  return musicMetadataModule;
}

function parseNameFromFile(filePath) {
  const base = path.basename(filePath, path.extname(filePath));
  const [artistPart, ...titleParts] = base.split(' - ');
  return {
    artist: artistPart?.trim() || '',
    title: titleParts.join(' - ').trim() || base.trim(),
  };
}

function lyricToText(lyric) {
  const lines = lyric?.originLines ?? [];
  return lines
    .filter((line) => line?.text)
    .map((line) => line.text)
    .join('\n')
    .trim();
}

async function collectFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return collectFiles(fullPath);
    return Promise.resolve(AUDIO_EXTENSIONS.has(path.extname(entry.name).toLowerCase()) ? [fullPath] : []);
  }));
  return nested.flat();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeKeyword(value) {
  return String(value ?? '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/（[^）]*）/g, ' ')
    .replace(/\[[^\]]*]/g, ' ')
    .replace(/[【】「」『』]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function createLyricService() {
  const netease = new NetEaseCloudMusic(logger);
  const qq = new QQMusic(logger);
  const youtube = {};
  const providers = [netease, qq];
  const providerManager = {
    tryResolve: () => null,
    getEnabledProviders: () => providers,
  };
  return new LyricService(netease, qq, youtube, providerManager, logger);
}

async function fetchLyricsText(lyricService, track) {
  const variants = [];
  const title = track.title?.trim() || '';
  const artist = track.artist?.trim() || '';
  const album = track.album?.trim() || '';
  if (title || artist) {
    variants.push({ title, artist, album, label: 'title+artist' });
  }
  if (title) {
    variants.push({ title, artist: '', album, label: 'title-only' });
  }
  const normalizedTitle = normalizeKeyword(title);
  const normalizedArtist = normalizeKeyword(artist);
  if (normalizedTitle && (normalizedTitle !== title || normalizedArtist !== artist)) {
    variants.push({
      title: normalizedTitle,
      artist: normalizedArtist,
      album,
      label: 'normalized',
    });
  }

  for (const variant of variants) {
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        const lyric = await lyricService.getLyrics({
          platform: Platform.LOCAL,
          platform_unique_id: `${track.filePath}#${variant.label}#${attempt}`,
          title: variant.title,
          artist: variant.artist,
          album: variant.album,
        });
        const text = lyricToText(lyric);
        if (text) return text;
      } catch (error) {
        logger.warn(`歌词检索失败 [${variant.label}] attempt=${attempt}: ${error instanceof Error ? error.message : String(error)}`);
      }
      if (attempt < 2) await sleep(500);
    }
  }

  return '';
}

async function readCoverDataUrl(filePath) {
  const { parseFile, selectCover } = await getMusicMetadata();
  const metadata = await parseFile(filePath);
  const cover = selectCover(metadata.common.picture);
  if (!cover) return '';
  return `data:${cover.format};base64,${Buffer.from(cover.data).toString('base64')}`;
}

async function readMetadata(filePath) {
  const { parseFile, selectCover } = await getMusicMetadata();
  const metadata = await parseFile(filePath);
  const picture = selectCover(metadata.common.picture);
  const lyricsValue = metadata.common.lyrics;
  const genreValue = metadata.common.genre;
  return {
    filePath,
    title: metadata.common.title ?? '',
    artist: metadata.common.artist ?? '',
    album: metadata.common.album ?? '',
    genre: Array.isArray(genreValue) ? genreValue.join(', ') : (genreValue ?? ''),
    year: typeof metadata.common.year === 'number' ? metadata.common.year : null,
    lyrics: Array.isArray(lyricsValue) ? lyricsValue.join('\n') : (lyricsValue ?? ''),
    coverDataUrl: picture ? `data:${picture.format};base64,${Buffer.from(picture.data).toString('base64')}` : '',
  };
}

function createFrame(frameId, body) {
  const header = Buffer.alloc(10);
  header.write(frameId, 0, 4, 'ascii');
  header.writeUInt32BE(body.length, 4);
  header.writeUInt16BE(0, 8);
  return Buffer.concat([header, body]);
}

function pushTextFrame(frames, frameId, value) {
  const normalized = String(value ?? '').trim();
  if (!normalized) return;
  frames.push(createFrame(frameId, Buffer.concat([
    Buffer.from([0x03]),
    Buffer.from(normalized, 'utf8'),
  ])));
}

function createUsltFrame(lyrics) {
  return createFrame('USLT', Buffer.concat([
    Buffer.from([0x03]),
    Buffer.from('eng', 'ascii'),
    Buffer.from([0x00]),
    Buffer.from(lyrics, 'utf8'),
  ]));
}

function parseDataUrl(dataUrl) {
  const match = /^data:([^;]+);base64,(.+)$/i.exec(String(dataUrl || '').trim());
  if (!match) return null;
  return {
    mime: match[1],
    data: Buffer.from(match[2], 'base64'),
  };
}

function createApicFrame(dataUrlPayload) {
  return createFrame('APIC', Buffer.concat([
    Buffer.from([0x03]),
    Buffer.from(dataUrlPayload.mime, 'ascii'),
    Buffer.from([0x00]),
    Buffer.from([0x03]),
    Buffer.from([0x00]),
    dataUrlPayload.data,
  ]));
}

function toSynchsafe(size) {
  return Buffer.from([
    (size >> 21) & 0x7f,
    (size >> 14) & 0x7f,
    (size >> 7) & 0x7f,
    size & 0x7f,
  ]);
}

function fromSynchsafe(bytes) {
  if (bytes.length !== 4) return 0;
  return ((bytes[0] & 0x7f) << 21)
    | ((bytes[1] & 0x7f) << 14)
    | ((bytes[2] & 0x7f) << 7)
    | (bytes[3] & 0x7f);
}

function createId3Header(bodySize) {
  const header = Buffer.alloc(10);
  header.write('ID3', 0, 3, 'ascii');
  header[3] = 0x03;
  header[4] = 0x00;
  header[5] = 0x00;
  toSynchsafe(bodySize).copy(header, 6);
  return header;
}

function stripId3v2(buffer) {
  if (buffer.length < 10 || buffer.toString('ascii', 0, 3) !== 'ID3') return buffer;
  const tagSize = fromSynchsafe(buffer.subarray(6, 10));
  const total = 10 + tagSize;
  if (total <= 10 || total > buffer.length) return buffer;
  return buffer.subarray(total);
}

function stripId3v1(buffer) {
  if (buffer.length < 128) return buffer;
  const start = buffer.length - 128;
  return buffer.toString('ascii', start, start + 3) === 'TAG'
    ? buffer.subarray(0, start)
    : buffer;
}

async function writeMetadata(payload) {
  const source = await fs.readFile(payload.filePath);
  const audioPayload = stripId3v1(stripId3v2(source));
  const frames = [];
  pushTextFrame(frames, 'TIT2', payload.title);
  pushTextFrame(frames, 'TPE1', payload.artist);
  pushTextFrame(frames, 'TALB', payload.album);
  pushTextFrame(frames, 'TCON', payload.genre);
  if (typeof payload.year === 'number') pushTextFrame(frames, 'TYER', String(Math.trunc(payload.year)));
  if (payload.lyrics.trim()) frames.push(createUsltFrame(payload.lyrics.trim()));
  const cover = parseDataUrl(payload.coverDataUrl);
  if (cover) frames.push(createApicFrame(cover));

  const tagBody = Buffer.concat(frames);
  const nextBuffer = tagBody.length
    ? Buffer.concat([createId3Header(tagBody.length), tagBody, audioPayload])
    : audioPayload;
  const tempPath = `${payload.filePath}.metadata-editor.tmp`;
  await fs.writeFile(tempPath, nextBuffer);
  await fs.rename(tempPath, payload.filePath);
  return {
    ok: true,
    filePath: payload.filePath,
    message: 'metadata written',
  };
}

async function embedFile(lyricService, filePath, options) {
  const existing = await readMetadata(filePath);
  const fromName = parseNameFromFile(filePath);
  const title = existing.title || fromName.title;
  const artist = existing.artist || fromName.artist;
  const album = existing.album || title;
  const genre = existing.genre || options.genre;
  let lyrics = existing.lyrics;

  if (!lyrics.trim() && options.fetchLyrics) {
    lyrics = await fetchLyricsText(lyricService, { filePath, title, artist, album });
  }

  const coverDataUrl = existing.coverDataUrl || await readCoverDataUrl(filePath);
  const payload = {
    filePath,
    title,
    artist,
    album,
    genre,
    year: existing.year,
    lyrics,
    coverDataUrl,
  };

  const missing = [];
  if (!payload.title) missing.push('标题');
  if (!payload.artist) missing.push('艺术家');
  if (!payload.genre) missing.push('流派');
  if (!payload.lyrics) missing.push('歌词');
  if (missing.length > 0) {
    return {
      ok: false,
      filePath,
      message: `缺少${missing.join('、')}，未写入。`,
      payload,
    };
  }

  if (options.dryRun) {
    return {
      ok: true,
      filePath,
      message: 'dry-run: 元数据可写入。',
      payload,
    };
  }

  return await writeMetadata(payload);
}

async function main() {
  const argv = process.argv.slice(2).filter((arg) => arg !== '--');
  const args = new Set(argv);
  const resourceDir = path.resolve(argv.find((arg) => !arg.startsWith('--')) || DEFAULT_RESOURCE_DIR);
  const options = {
    dryRun: args.has('--dry-run'),
    fetchLyrics: !args.has('--no-lyrics'),
    genre: process.env.TEST_MUSIC_DEFAULT_GENRE || 'Pop',
  };

  const files = await collectFiles(resourceDir);
  if (!files.length) {
    console.error(`No MP3 files found: ${resourceDir}`);
    process.exit(1);
  }

  const lyricService = createLyricService();
  let failed = 0;
  for (const file of files) {
    try {
      const result = await embedFile(lyricService, file, options);
      if (!result.ok) failed += 1;
      console.log(`${result.ok ? '[OK]' : '[FAIL]'} ${path.relative(process.cwd(), file)} - ${result.message}`);
    } catch (error) {
      failed += 1;
      console.log(`[FAIL] ${path.relative(process.cwd(), file)} - ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  process.exit(failed > 0 ? 2 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
