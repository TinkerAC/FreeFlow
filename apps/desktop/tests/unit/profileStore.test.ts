import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  ensureWalletProfile,
  loadProfileIndex,
  updateProfileMetadata,
} from '@main/core/profileStore';
import { buildWalletProfileId } from '@src/shared/profile/profile';

describe('profileStore', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('sets wallet profile as active profile and creates isolated profile directory', () => {
    const rootDataPath = fs.mkdtempSync(path.join(os.tmpdir(), 'freeflow-profile-store-'));
    tempDirs.push(rootDataPath);

    const input = {
      address: '0x1111111111111111111111111111111111111111',
      chainId: 11155111,
    };

    const profile = ensureWalletProfile(rootDataPath, input);
    const expectedProfileId = buildWalletProfileId(input);
    const index = loadProfileIndex(rootDataPath);
    const expectedProfilePath = path.join(rootDataPath, 'profiles', expectedProfileId);

    expect(profile.id).toBe(expectedProfileId);
    expect(index.activeProfileId).toBe(expectedProfileId);
    expect(fs.existsSync(expectedProfilePath)).toBe(true);
  });

  it('updates profile metadata in profile index', () => {
    const rootDataPath = fs.mkdtempSync(path.join(os.tmpdir(), 'freeflow-profile-store-'));
    tempDirs.push(rootDataPath);

    const input = {
      address: '0x2222222222222222222222222222222222222222',
      chainId: 11155111,
    };

    const profile = ensureWalletProfile(rootDataPath, input);
    const updated = updateProfileMetadata(rootDataPath, profile.id, {
      web25DisplayName: 'Alice',
      web25AvatarUrl: 'https://example.com/avatar.png',
    });

    const index = loadProfileIndex(rootDataPath);
    const active = index.profiles.find((item) => item.id === profile.id);

    expect(updated.web25DisplayName).toBe('Alice');
    expect(updated.web25AvatarUrl).toBe('https://example.com/avatar.png');
    expect(active?.web25DisplayName).toBe('Alice');
    expect(active?.web25AvatarUrl).toBe('https://example.com/avatar.png');
  });
});
