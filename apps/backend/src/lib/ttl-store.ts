type TtlEntry<TValue> = {
  value: TValue;
  expiresAt: number;
};

export class TtlStore<TValue> {
  private readonly entries = new Map<string, TtlEntry<TValue>>();

  constructor(cleanupIntervalMs = 60_000) {
    const timer = setInterval(() => this.pruneExpired(), cleanupIntervalMs);
    timer.unref?.();
  }

  set(key: string, value: TValue, ttlMs: number) {
    this.entries.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  get(key: string) {
    const entry = this.entries.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(key);
      return null;
    }
    return entry.value;
  }

  take(key: string) {
    const value = this.get(key);
    this.entries.delete(key);
    return value;
  }

  delete(key: string) {
    return this.entries.delete(key);
  }

  private pruneExpired() {
    const now = Date.now();
    for (const [key, entry] of this.entries.entries()) {
      if (entry.expiresAt <= now) {
        this.entries.delete(key);
      }
    }
  }
}
