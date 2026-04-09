export function parseCookieHeader(rawCookieHeader?: string) {
  if (!rawCookieHeader) return {};

  const entries = rawCookieHeader
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((pair) => {
      const separatorIndex = pair.indexOf('=');
      if (separatorIndex === -1) return null;
      const key = pair.slice(0, separatorIndex).trim();
      const value = pair.slice(separatorIndex + 1).trim();
      if (!key) return null;
      try {
        return [key, decodeURIComponent(value)] as const;
      } catch {
        return [key, value] as const;
      }
    })
    .filter((entry): entry is readonly [string, string] => entry !== null);

  return Object.fromEntries(entries);
}
