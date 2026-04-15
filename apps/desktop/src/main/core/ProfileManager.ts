import { inject, injectable } from 'inversify';
import { DISymbol } from '@main/di/symbol';
import type { DataPath } from '@main/core/PathConfig';
import {
  ensureProfilePath,
  loadProfileIndex,
  sanitizeProfileId,
  saveProfileIndex,
} from '@main/core/profileStore';
import type { ProfileSummary, SwitchProfileResult } from '@src/shared/profile/profile';

function nowIso(): string {
  return new Date().toISOString();
}

@injectable()
export class ProfileManager {
  constructor(
    @inject(DISymbol.DataPath) private readonly dataPath: DataPath,
  ) {}

  private readIndex() {
    return loadProfileIndex(this.dataPath.rootDataPath);
  }

  public getActiveProfile(): ProfileSummary {
    const index = this.readIndex();
    const active = index.profiles.find((profile) => profile.id === index.activeProfileId);
    if (active) return active;
    return index.profiles[0];
  }

  public listProfiles(): ProfileSummary[] {
    return this.readIndex().profiles;
  }

  public createProfile(input?: { id?: string; name?: string }): ProfileSummary {
    const index = this.readIndex();
    const timestamp = nowIso();

    const generatedId = input?.id
      ? sanitizeProfileId(input.id)
      : sanitizeProfileId(`${input?.name || 'profile'}-${Date.now().toString(36)}`);

    if (index.profiles.some((profile) => profile.id === generatedId)) {
      throw new Error(`Profile already exists: ${generatedId}`);
    }

    const profile: ProfileSummary = {
      id: generatedId,
      name: String(input?.name || '').trim() || generatedId,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    ensureProfilePath(this.dataPath.rootDataPath, profile.id);
    const next = {
      ...index,
      profiles: [...index.profiles, profile],
    };
    saveProfileIndex(this.dataPath.rootDataPath, next);
    return profile;
  }

  public switchProfile(profileId: string): SwitchProfileResult {
    const safeProfileId = sanitizeProfileId(profileId);
    const index = this.readIndex();
    const target = index.profiles.find((profile) => profile.id === safeProfileId);
    if (!target) {
      throw new Error(`Profile not found: ${safeProfileId}`);
    }

    if (index.activeProfileId === safeProfileId) {
      return {
        activeProfileId: safeProfileId,
        relaunchRequired: false,
      };
    }

    ensureProfilePath(this.dataPath.rootDataPath, safeProfileId);

    const next = {
      ...index,
      activeProfileId: safeProfileId,
      profiles: index.profiles.map((profile) => (
        profile.id === safeProfileId
          ? { ...profile, updatedAt: nowIso() }
          : profile
      )),
    };
    saveProfileIndex(this.dataPath.rootDataPath, next);

    return {
      activeProfileId: safeProfileId,
      relaunchRequired: true,
    };
  }
}

