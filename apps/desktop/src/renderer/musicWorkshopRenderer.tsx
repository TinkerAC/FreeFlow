import React from 'react';
import { createRoot } from 'react-dom/client';
import MusicWorkshop from './windows/MusicWorkshop/MusicWorkshop';
import { SettingsProvider } from '@renderer/core/config/SettingsContext';
import '@renderer/styles/tokens.material.css';
import DesignSystemBridge from '@renderer/designSystem/DesignSystemBridge';

console.log('[FreeFlow] : Music Workshop Renderer execution started');

createRoot(document.getElementById('app')!).render(
  <SettingsProvider>
    <DesignSystemBridge>
      <MusicWorkshop />
    </DesignSystemBridge>
  </SettingsProvider>,
);
