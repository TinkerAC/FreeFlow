export interface HifiniCookies {
  'bbs_sid'?: string;
  'bbs_token'?: string;
}

export enum AppIcon {
  Default = 'default',
  JetBrains = 'jetbrains',
  Adobe = 'adobe',
}

export function getIconOptions(): { label: string; value: AppIcon }[] {
  return Object.values(AppIcon).map((icon) => ({
    // 把枚举值做一次驼峰转可读文本（首字母大写）
    label: icon
      .split(/[_\- ]+/)                // 如果有下划线、短横线、空格也能处理
      .map(word => word[0].toUpperCase() + word.slice(1))
      .join(' '),
    value: icon as AppIcon,
  }));
}