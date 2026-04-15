import type { Web25Session } from './client';
import { getRuntimeProfileId } from '@renderer/core/profile/runtimeProfile';

const WEB25_SESSION_STORAGE_KEY_PREFIX = 'freeflow.web25.session';
const WEB25_SESSION_CHANNEL_PREFIX = 'freeflow.web25.session.channel';
const WEB25_SESSION_EVENT_PREFIX = 'freeflow:web25-session-updated';

let cachedChannel: BroadcastChannel | null = null;
let cachedChannelName = '';

function getSessionStorageKey() {
  return `${WEB25_SESSION_STORAGE_KEY_PREFIX}.${getRuntimeProfileId()}`;
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

function emitWeb25Session(session: Web25Session | null) {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(new CustomEvent<Web25Session | null>(getSessionEventName(), {
    detail: session,
  }));

  const channel = getChannel();
  if (!channel) return;
  channel.postMessage(session);
}

export function writeWeb25SessionSnapshot(session: Web25Session | null) {
  if (typeof window === 'undefined') return;
  const storageKey = getSessionStorageKey();

  if (!session) {
    window.localStorage.removeItem(storageKey);
  } else {
    window.localStorage.setItem(storageKey, JSON.stringify(session));
  }
  emitWeb25Session(session);
}

export function subscribeWeb25SessionSnapshot(listener: (session: Web25Session | null) => void) {
  if (typeof window === 'undefined') {
    return () => {
    };
  }

  const onCustomEvent = (event: Event) => {
    const payload = (event as CustomEvent<Web25Session | null>).detail;
    listener(normalizeSession(payload));
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
  const onChannelMessage = (event: MessageEvent) => {
    listener(normalizeSession(event.data));
  };

  window.addEventListener(getSessionEventName(), onCustomEvent as EventListener);
  window.addEventListener('storage', onStorage);
  channel?.addEventListener('message', onChannelMessage);

  return () => {
    window.removeEventListener(getSessionEventName(), onCustomEvent as EventListener);
    window.removeEventListener('storage', onStorage);
    channel?.removeEventListener('message', onChannelMessage);
  };
}
