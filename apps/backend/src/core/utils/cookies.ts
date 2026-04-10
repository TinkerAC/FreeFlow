/**
 * 解析原始 Cookie 请求头。
 * 这里只做最小化解析，保持行为可预测，不引入额外框架依赖。
 */
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
        // 非法编码不阻断请求，保留原值以便后续逻辑自行判断。
        return [key, value] as const;
      }
    })
    .filter((entry): entry is readonly [string, string] => entry !== null);

  return Object.fromEntries(entries);
}
