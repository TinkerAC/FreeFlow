// global.d.ts
import type { MainApi } from '@src/shared/ipc/types';

declare global {
  interface Window {
    mainApi: MainApi;
  }
}

// 为 MUI 主题添加自定义状态类型
declare module '@mui/material/styles' {
  interface Theme {
    status: {
      danger: string;
    };
  }

  // allow configuration using `createTheme()`
  interface ThemeOptions {
    status?: {
      danger?: string;
    };
  }
}
