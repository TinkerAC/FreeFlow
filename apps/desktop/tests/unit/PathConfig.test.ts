import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

const targetProfileId = 'wallet-11155111-0x1111111111111111111111111111111111111111';

async function loadPathConfig(userDataPath: string) {
  vi.resetModules();
  vi.doMock('electron', () => ({
    app: {
      getPath: () => userDataPath,
    },
  }));

  return await import('@main/core/PathConfig');
}

describe('PathConfig', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    vi.resetModules();
    vi.doUnmock('electron');

    for (const dir of tempDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('updates the active profile data paths before SQLite is initialized', async () => {
    const userDataPath = fs.mkdtempSync(path.join(os.tmpdir(), 'freeflow-path-config-'));
    tempDirs.push(userDataPath);

    const rootDataPath = path.join(userDataPath, 'data');
    fs.mkdirSync(rootDataPath, { recursive: true });
    fs.writeFileSync(
      path.join(rootDataPath, 'profiles.json'),
      JSON.stringify({
        activeProfileId: 'default',
        profiles: [
          {
            id: 'default',
            name: 'Default',
            type: 'local',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
          {
            id: targetProfileId,
            name: 'Wallet',
            type: 'wallet',
            walletAddress: '0x1111111111111111111111111111111111111111',
            chainId: 11155111,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      }),
      'utf8',
    );

    const pathConfig = await loadPathConfig(userDataPath);

    expect(pathConfig.AppDataPath.profileId).toBe('default');

    const activeDataPath = pathConfig.configureActiveProfileDataPath(targetProfileId);
    const expectedProfilePath = path.join(rootDataPath, 'profiles', targetProfileId);

    expect(activeDataPath).toBe(pathConfig.AppDataPath);
    expect(pathConfig.AppDataPath.profileId).toBe(targetProfileId);
    expect(pathConfig.AppDataPath.profilePath).toBe(expectedProfilePath);
    expect(pathConfig.AppDataPath.dbPath).toBe(path.join(expectedProfilePath, 'database.sqlite'));
    expect(fs.existsSync(path.join(expectedProfilePath, 'fileCache'))).toBe(true);
    expect(fs.existsSync(path.join(expectedProfilePath, 'music'))).toBe(true);
  });
});
