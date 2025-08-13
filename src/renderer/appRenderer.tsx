import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Route, Routes } from 'react-router-dom';

import Application from './components/Application';
import PreferenceWindow from '@components/PreferenceWindow/PreferenceWindow';

// 进度条皮肤上下文（注册处里导出的 Provider）
import { ProgressSkinProvider } from '@components/Playerbar/ProgressBar/ProgressSkinRegistry';

// 你的设置上下文（必须提供全局的 Settings）
import { SettingsProvider } from '@renderer/core/config/SettingsContext';

// 读取单个设置项的 hook（注意：这个返回“对象”，不是数组）
import { useSetting } from '@components/Maincontent/SettingView/useSettings';

// 全局 design tokens（只要引入一次）
import '@renderer/styles/tokens.material.css';

// 小桥：把“配置里的进度条皮肤”转成 ProgressSkinProvider 的 value
function SkinBridge({ children }: { children: React.ReactNode }) {
  // ✅ 正确写法：useSetting 返回 { value, setValue }
  const skin = useSetting<'classic' | 'neon' | 'waveform' | 'knob'>(
    'audio.progressSkin',
    'classic',
  );

  // 注意：ProgressSkinProvider 期望的是字符串（'classic' | 'neon' | ...）
  return (
    <ProgressSkinProvider value={skin.value as any}>
      {children}
    </ProgressSkinProvider>
  );
}

const rootEl = document.getElementById('app')!;
createRoot(rootEl).render(
  <React.StrictMode>
    {/* 1) 先提供 Settings，上层所有 useSetting/useSettings 都能拿到值 */}
    <SettingsProvider>
      {/* 2) 再桥接皮肤 Provider（内部会读取配置里的 audio.progressSkin） */}
      <SkinBridge>
        {/* 3) 应用路由 */}
        <HashRouter>
          <Routes>
            <Route path="/" element={<Application />} />
            <Route path="/settings" element={<PreferenceWindow />} />
          </Routes>
        </HashRouter>
      </SkinBridge>
    </SettingsProvider>
  </React.StrictMode>
);