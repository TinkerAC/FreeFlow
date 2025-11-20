import path from 'node:path';
import { spawnSync } from 'node:child_process';

const KEYWORD = process.env.YT_LIVE_KEYWORD ?? 'lofi hip hop';
const RUNNER = path.resolve(__dirname, '../live/YouTubeMusicLiveRunner.ts');
const TS_NODE_LOADER = path.resolve(__dirname, '../../node_modules/ts-node/esm.mjs');

function runLiveSearch(keyword: string) {
  const result = spawnSync(process.execPath, ['--loader', TS_NODE_LOADER, RUNNER, keyword], {
    encoding: 'utf-8',
    env: {
      ...process.env,
      YT_LIVE_KEYWORD: keyword,
    },
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `live runner exited with code ${result.status}`);
  }

  const payload = result.stdout.trim();
  if (!payload) {
    throw new Error('Live runner produced empty output');
  }
  return JSON.parse(payload);
}

describe('YouTubeMusic Provider (live)', () => {
  jest.setTimeout(60000);
  let liveResult: any;

  beforeAll(() => {
    liveResult = runLiveSearch(KEYWORD);
  });

  test('searchTrack returns playable results for keyword', () => {
    expect(liveResult.trackCount).toBeGreaterThan(0);
    expect(liveResult.firstTrack).toBeTruthy();
    expect(typeof liveResult.firstTrack.id).toBe('string');
    expect(liveResult.firstTrack.title.length).toBeGreaterThan(0);
  });

  test('search returns both tracks and playlists', () => {
    expect(liveResult.trackCount).toBeGreaterThan(0);
    expect(liveResult.playlistCount).toBeGreaterThan(0);
  });
});
