import { profileContext } from '@renderer/core/electronContextApi';

const ACTIVE_PROFILE_ID_STORAGE_KEY = 'freeflow.active-profile-id';
const DEFAULT_PROFILE_ID = 'default';

function normalizeProfileId(raw: string | null | undefined): string {
  const value = String(raw || '').trim();
  return value || DEFAULT_PROFILE_ID;
}

export function getRuntimeProfileId(): string {
  if (typeof window === 'undefined') return DEFAULT_PROFILE_ID;
  const stored = window.localStorage.getItem(ACTIVE_PROFILE_ID_STORAGE_KEY);
  return normalizeProfileId(stored);
}

export function setRuntimeProfileId(profileId: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ACTIVE_PROFILE_ID_STORAGE_KEY, normalizeProfileId(profileId));
}

export async function bootstrapRuntimeProfileId(): Promise<string> {
  const fallback = getRuntimeProfileId();
  try {
    const active = await profileContext.getActiveProfile();
    const resolved = normalizeProfileId(active?.id);
    setRuntimeProfileId(resolved);
    return resolved;
  } catch {
    setRuntimeProfileId(fallback);
    return fallback;
  }
}

