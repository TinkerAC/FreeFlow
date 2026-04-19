import type { Web25Session } from './client';
import { getRuntimeProfileId, subscribeRuntimeProfileId } from '@renderer/core/profile/runtimeProfile';

const WEB25_SESSION_STORAGE_KEY_PREFIX = 'freeflow.web25.session';
const WEB25_SESSION_TOKEN_STORAGE_KEY_PREFIX = 'freeflow.web25.session-token';
const WEB25_SESSION_CHANNEL_PREFIX = 'freeflow.web25.session.channel';
const WEB25_SESSION_EVENT_PREFIX = 'freeflow:web25-session-updated';
const WEB25_SESSION_GLOBAL_CHANNEL = 'freeflow.web25.session.channel.global';
const WEB25_SESSION_GLOBAL_EVENT = 'freeflow:web25-session-updated';

let cachedChannel: BroadcastChannel | null = null;
let cachedChannelName = '';
let cachedGlobalChannel: BroadcastChannel | null = null;

type Web25SessionEventPayload = {
  profileId: string;
  session: Web25Session | null;
};

function getSessionStorageKey() {
  return `${WEB25_SESSION_STORAGE_KEY_PREFIX}.${getRuntimeProfileId()}`;
}

function getSessionTokenStorageKey() {
  return `${WEB25_SESSION_TOKEN_STORAGE_KEY_PREFIX}.${getRuntimeProfileId()}`;
}

function isWeb25SessionStorageKey(key: string) {
  return key.startsWith(`${WEB25_SESSION_STORAGE_KEY_PREFIX}.`);
}

function isWeb25SessionTokenStorageKey(key: string) {
  return key.startsWith(`${WEB25_SESSION_TOKEN_STORAGE_KEY_PREFIX}.`);
}

function getSessionChannelName() {
  return `${WEB25_SESSION_CHANNEL_PREFIX}.${getRuntimeProfileId()}`;
}

function getSessionEventName() {
  return `${WEB25_SESSION_EVENT_PREFIX}.${getRuntimeProfileId()}`;
}

function getChannel() {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') {
    return null;
  }
  const channelName = getSessionChannelName();
  if (!cachedChannel || cachedChannelName !== channelName) {
    cachedChannel?.close();
    cachedChannel = new BroadcastChannel(channelName);
    cachedChannelName = channelName;
  }
  return cachedChannel;
}

function normalizeSession(value: unknown): Web25Session | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<Web25Session>;
  if (!candidate.sessionId || !candidate.address || !candidate.chainId) return null;
  return {
    sessionId: String(candidate.sessionId),
    address: String(candidate.address),
    chainId: Number(candidate.chainId),
    nonce: String(candidate.nonce ?? ''),
    domain: String(candidate.domain ?? ''),
    uri: String(candidate.uri ?? ''),
    issuedAt: String(candidate.issuedAt ?? ''),
    verifiedAt: String(candidate.verifiedAt ?? ''),
  };
}

export function readWeb25SessionSnapshot(): Web25Session | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(getSessionStorageKey());
  if (!raw) return null;

  try {
    return normalizeSession(JSON.parse(raw));
  } catch {
    return null;
  }
}

function getGlobalChannel() {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') {
    return null;
  }
  if (!cachedGlobalChannel) {
    cachedGlobalChannel = new BroadcastChannel(WEB25_SESSION_GLOBAL_CHANNEL);
  }
  return cachedGlobalChannel;
}

export function readWeb25SessionTokenSnapshot(): string | null {
  if (typeof window === 'undefined') return null;
  const token = window.localStorage.getItem(getSessionTokenStorageKey());
  return token?.trim() || null;
}

function buildSessionEventPayload(session: Web25Session | null): Web25SessionEventPayload {
  return {
    profileId: getRuntimeProfileId(),
    session,
  };
}

function readSessionFromEventPayload(payload: unknown): Web25Session | null | undefined {
  if (payload && typeof payload === 'object' && 'profileId' in payload && 'session' in payload) {
    const typed = payload as Partial<Web25SessionEventPayload>;
    if (String(typed.profileId || '') !== getRuntimeProfileId()) return undefined;
    return normalizeSession(typed.session);
  }

  return normalizeSession(payload);
}

function emitWeb25Session(session: Web25Session | null) {
  if (typeof window === 'undefined') return;
  const payload = buildSessionEventPayload(session);

  window.dispatchEvent(new CustomEvent<Web25SessionEventPayload>(getSessionEventName(), {
    detail: payload,
  }));
  window.dispatchEvent(new CustomEvent<Web25SessionEventPayload>(WEB25_SESSION_GLOBAL_EVENT, {
    detail: payload,
  }));

  const channel = getChannel();
  channel?.postMessage(payload);
  getGlobalChannel()?.postMessage(payload);
}

export function writeWeb25SessionSnapshot(session: Web25Session | null, sessionToken?: string | null) {
  if (typeof window === 'undefined') return;
  const storageKey = getSessionStorageKey();
  const tokenStorageKey = getSessionTokenStorageKey();

  if (!session) {
    window.localStorage.removeItem(storageKey);
    window.localStorage.removeItem(tokenStorageKey);
  } else {
    window.localStorage.setItem(storageKey, JSON.stringify(session));
  }

  if (sessionToken !== undefined) {
    if (sessionToken) {
      window.localStorage.setItem(tokenStorageKey, sessionToken);
    } else {
      window.localStorage.removeItem(tokenStorageKey);
    }
  }

  emitWeb25Session(session);
}

export type Web25SessionClearScope = 'current-profile' | 'all-profiles';

export function clearWeb25SessionSnapshots(scope: Web25SessionClearScope = 'current-profile') {
  if (typeof window === 'undefined') return;

  if (scope === 'all-profiles') {
    const keysToDelete: string[] = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (key && isWeb25SessionStorageKey(key)) {
        keysToDelete.push(key);
      }
      if (key && isWeb25SessionTokenStorageKey(key)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach((key) => window.localStorage.removeItem(key));
    emitWeb25Session(null);
    return;
  }

  writeWeb25SessionSnapshot(null);
}

export function subscribeWeb25SessionSnapshot(listener: (session: Web25Session | null) => void) {
  if (typeof window === 'undefined') {
    return () => {
    };
  }

  const onCustomEvent = (event: Event) => {
    const session = readSessionFromEventPayload((event as CustomEvent<Web25SessionEventPayload | Web25Session | null>).detail);
    if (session !== undefined) listener(session);
  };

  const onStorage = (event: StorageEvent) => {
    if (event.key !== getSessionStorageKey()) return;
    if (!event.newValue) {
      listener(null);
      return;
    }
    try {
      listener(normalizeSession(JSON.parse(event.newValue)));
    } catch {
      listener(null);
    }
  };

  const channel = getChannel();
  const globalChannel = getGlobalChannel();
  const onChannelMessage = (event: MessageEvent) => {
    const session = readSessionFromEventPayload(event.data);
    if (session !== undefined) listener(session);
  };
  const unsubscribeRuntimeProfile = subscribeRuntimeProfileId(() => {
    listener(readWeb25SessionSnapshot());
  });

  window.addEventListener(getSessionEventName(), onCustomEvent as EventListener);
  window.addEventListener(WEB25_SESSION_GLOBAL_EVENT, onCustomEvent as EventListener);
  window.addEventListener('storage', onStorage);
  channel?.addEventListener('message', onChannelMessage);
  globalChannel?.addEventListener('message', onChannelMessage);

  return () => {
    window.removeEventListener(getSessionEventName(), onCustomEvent as EventListener);
    window.removeEventListener(WEB25_SESSION_GLOBAL_EVENT, onCustomEvent as EventListener);
    window.removeEventListener('storage', onStorage);
    channel?.removeEventListener('message', onChannelMessage);
    globalChannel?.removeEventListener('message', onChannelMessage);
    unsubscribeRuntimeProfile();
  };
}
