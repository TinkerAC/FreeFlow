import type { Web25Session } from './client';

const WEB25_SESSION_STORAGE_KEY = 'freeflow.web25.session';
const WEB25_SESSION_CHANNEL = 'freeflow.web25.session.channel';
const WEB25_SESSION_EVENT = 'freeflow:web25-session-updated';

let cachedChannel: BroadcastChannel | null = null;

function getChannel() {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') {
    return null;
  }
  if (!cachedChannel) {
    cachedChannel = new BroadcastChannel(WEB25_SESSION_CHANNEL);
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
  const raw = window.localStorage.getItem(WEB25_SESSION_STORAGE_KEY);
  if (!raw) return null;

  try {
    return normalizeSession(JSON.parse(raw));
  } catch {
    return null;
  }
}

function emitWeb25Session(session: Web25Session | null) {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(new CustomEvent<Web25Session | null>(WEB25_SESSION_EVENT, {
    detail: session,
  }));

  const channel = getChannel();
  if (!channel) return;
  channel.postMessage(session);
}

export function writeWeb25SessionSnapshot(session: Web25Session | null) {
  if (typeof window === 'undefined') return;

  if (!session) {
    window.localStorage.removeItem(WEB25_SESSION_STORAGE_KEY);
  } else {
    window.localStorage.setItem(WEB25_SESSION_STORAGE_KEY, JSON.stringify(session));
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
    if (event.key !== WEB25_SESSION_STORAGE_KEY) return;
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

  window.addEventListener(WEB25_SESSION_EVENT, onCustomEvent as EventListener);
  window.addEventListener('storage', onStorage);
  channel?.addEventListener('message', onChannelMessage);

  return () => {
    window.removeEventListener(WEB25_SESSION_EVENT, onCustomEvent as EventListener);
    window.removeEventListener('storage', onStorage);
    channel?.removeEventListener('message', onChannelMessage);
  };
}
