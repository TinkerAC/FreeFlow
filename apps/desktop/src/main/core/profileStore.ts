import fs from 'fs';
import path from 'path';
import type { ProfileIndex, ProfileSummary } from '@src/shared/profile/profile';

export const DEFAULT_PROFILE_ID = 'default';
const PROFILE_INDEX_FILE = 'profiles.json';

function nowIso(): string {
  return new Date().toISOString();
}

export function sanitizeProfileId(raw: string): string {
  const normalized = raw.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-');
  const collapsed = normalized.replace(/-+/g, '-').replace(/^-|-$/g, '');
  return collapsed || DEFAULT_PROFILE_ID;
}

export function buildDefaultProfile(): ProfileSummary {
  const timestamp = nowIso();
  return {
    id: DEFAULT_PROFILE_ID,
    name: 'Default',
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function getProfileIndexPath(rootDataPath: string): string {
  return path.join(rootDataPath, PROFILE_INDEX_FILE);
}

function writeProfileIndex(rootDataPath: string, index: ProfileIndex): void {
  const filePath = getProfileIndexPath(rootDataPath);
  fs.writeFileSync(filePath, `${JSON.stringify(index, null, 2)}\n`, 'utf8');
}

function normalizeProfile(profile: ProfileSummary): ProfileSummary {
  const timestamp = nowIso();
  return {
    id: sanitizeProfileId(profile.id),
    name: String(profile.name || '').trim() || 'Profile',
    createdAt: profile.createdAt || timestamp,
    updatedAt: profile.updatedAt || timestamp,
  };
}

function normalizeIndex(index: Partial<ProfileIndex>): ProfileIndex {
  const profiles = (index.profiles || [])
    .filter((profile): profile is ProfileSummary => Boolean(profile && profile.id))
    .map(normalizeProfile);

  const uniqueProfiles: ProfileSummary[] = [];
  const seen = new Set<string>();
  for (const profile of profiles) {
    if (seen.has(profile.id)) continue;
    seen.add(profile.id);
    uniqueProfiles.push(profile);
  }

  if (!uniqueProfiles.length) {
    uniqueProfiles.push(buildDefaultProfile());
  }

  const activeProfileId = uniqueProfiles.some((profile) => profile.id === index.activeProfileId)
    ? String(index.activeProfileId)
    : uniqueProfiles[0].id;

  return {
    activeProfileId,
    profiles: uniqueProfiles,
  };
}

export function loadProfileIndex(rootDataPath: string): ProfileIndex {
  const indexPath = getProfileIndexPath(rootDataPath);

  if (!fs.existsSync(indexPath)) {
    const initial: ProfileIndex = {
      activeProfileId: DEFAULT_PROFILE_ID,
      profiles: [buildDefaultProfile()],
    };
    writeProfileIndex(rootDataPath, initial);
    return initial;
  }

  try {
    const raw = fs.readFileSync(indexPath, 'utf8');
    const parsed = JSON.parse(raw) as Partial<ProfileIndex>;
    const normalized = normalizeIndex(parsed);
    writeProfileIndex(rootDataPath, normalized);
    return normalized;
  } catch {
    const fallback: ProfileIndex = {
      activeProfileId: DEFAULT_PROFILE_ID,
      profiles: [buildDefaultProfile()],
    };
    writeProfileIndex(rootDataPath, fallback);
    return fallback;
  }
}

export function saveProfileIndex(rootDataPath: string, index: ProfileIndex): ProfileIndex {
  const normalized = normalizeIndex(index);
  writeProfileIndex(rootDataPath, normalized);
  return normalized;
}

export function ensureProfilePath(rootDataPath: string, profileId: string): string {
  const safeProfileId = sanitizeProfileId(profileId);
  const profilePath = path.join(rootDataPath, 'profiles', safeProfileId);
  if (!fs.existsSync(profilePath)) {
    fs.mkdirSync(profilePath, { recursive: true });
  }
  return profilePath;
}

