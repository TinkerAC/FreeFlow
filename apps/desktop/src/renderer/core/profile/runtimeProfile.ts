import { profileContext } from '@renderer/core/electronContextApi';

const ACTIVE_PROFILE_ID_STORAGE_KEY = 'freeflow.active-profile-id';
const DEFAULT_PROFILE_ID = 'default';
const RUNTIME_PROFILE_CHANGED_EVENT = 'freeflow:runtime-profile-changed';

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
  const normalized = normalizeProfileId(profileId);
  window.localStorage.setItem(ACTIVE_PROFILE_ID_STORAGE_KEY, normalized);
  window.dispatchEvent(new CustomEvent<string>(RUNTIME_PROFILE_CHANGED_EVENT, {
    detail: normalized,
  }));
}

export function subscribeRuntimeProfileId(listener: (profileId: string) => void): () => void {
  if (typeof window === 'undefined') {
    return () => {
    };
  }

  const onProfileChanged = (event: Event) => {
    listener(normalizeProfileId((event as CustomEvent<string>).detail));
  };

  const onStorage = (event: StorageEvent) => {
    if (event.key !== ACTIVE_PROFILE_ID_STORAGE_KEY) return;
    listener(normalizeProfileId(event.newValue));
  };

  window.addEventListener(RUNTIME_PROFILE_CHANGED_EVENT, onProfileChanged as EventListener);
  window.addEventListener('storage', onStorage);

  return () => {
    window.removeEventListener(RUNTIME_PROFILE_CHANGED_EVENT, onProfileChanged as EventListener);
    window.removeEventListener('storage', onStorage);
  };
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

