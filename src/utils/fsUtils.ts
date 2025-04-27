
/**
 * 存储单元枚举
 */
export enum StorageUnit {
  BYTE = 'B',
  KILOBYTE = 'KB',
  MEGABYTE = 'MB',
  GIGABYTE = 'GB',
  TERABYTE = 'TB'
}

/**
 * 将字节数转换为指定的存储单元。
 * @param bytes 字节数
 * @param unit 目标存储单元
 * @returns 转换后的数值
 */
export function convertStorage(bytes: number, unit: StorageUnit): number {
  switch (unit) {
    case StorageUnit.BYTE:
      return bytes;
    case StorageUnit.KILOBYTE:
      return bytes / 1024;
    case StorageUnit.MEGABYTE:
      return bytes / 1024 ** 2;
    case StorageUnit.GIGABYTE:
      return bytes / 1024 ** 3;
    case StorageUnit.TERABYTE:
      return bytes / 1024 ** 4;
    default:
      return bytes;
  }
}



/**
 * 格式化字节大小为最适合的单位，并保留一定小数位。
 * 当数值达到或超过下一个单位时，会自动升级到更大的单位。
 * @param bytes 字节数
 * @param decimals 小数位数，默认 2
 * @returns 格式化后的字符串，如 '1.23 MB'
 */
export function formatStorageUnit(bytes: number, decimals = 2): string {
  const units = [
    { unit: StorageUnit.TERABYTE, size: 1024 ** 4 },
    { unit: StorageUnit.GIGABYTE, size: 1024 ** 3 },
    { unit: StorageUnit.MEGABYTE, size: 1024 ** 2 },
    { unit: StorageUnit.KILOBYTE, size: 1024 },
    { unit: StorageUnit.BYTE, size: 1 }
  ];

  for (const { unit, size } of units) {
    if (bytes >= size) {
      const value = bytes / size;
      return `${value.toFixed(decimals)} ${unit}`;
    }
  }
  return `0 ${StorageUnit.BYTE}`;
}
