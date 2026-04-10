import { Prisma } from '@prisma/client';

const AUTO_GENERATED_SLUG_PREFIXES = ['untitled-track-', 'untitled-draft-'];

/**
 * 生成对 URL 和前端展示都比较友好的 release slug。
 */
export function slugifyReleaseValue(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'untitled-track';
}

/**
 * 规范化“可选字符串”输入。
 * `undefined` 表示“不更新”，`null` 表示“显式清空”。
 */
export function normalizeNullableString(value: string | null | undefined) {
  if (value === undefined) return undefined;
  return value === null ? null : (value.trim() || null);
}

/**
 * 将字符串字段转换为数据库可接受的 nullable 形式。
 */
export function toNullableString(value: string | null) {
  return value === null ? null : (value.trim() || null);
}

/**
 * 兼容 Prisma JSON 字段对 `null` 和普通 JSON 值的区分。
 */
export function asJsonValue(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return value === null ? Prisma.JsonNull : value as Prisma.InputJsonValue;
}

/**
 * 判断当前 slug 是否还是系统自动生成的占位值。
 * 只有占位 slug 才会在用户第一次补全标题时自动重算，避免误覆盖人工修改的 slug。
 */
export function shouldRegenerateAutoSlug(slug: string) {
  return AUTO_GENERATED_SLUG_PREFIXES.some((prefix) => slug.startsWith(prefix));
}
