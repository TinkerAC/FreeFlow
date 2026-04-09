import React from 'react';
import { createRoot } from 'react-dom/client';
import MusicWorkshop from './windows/MusicWorkshop/MusicWorkshop';
import { SettingsProvider } from '@renderer/core/config/SettingsContext';
import '@renderer/styles/tokens.material.css';
import DesignSystemBridge from '@renderer/designSystem/DesignSystemBridge';
import { ensureWeb3Modal } from '@renderer/core/web3/bootstrap';

ensureWeb3Modal();

console.log('[FreeFlow] : Creators Workshop Renderer execution started');

createRoot(document.getElementById('app')!).render(
  <SettingsProvider>
    <DesignSystemBridge>
      <MusicWorkshop />
    </DesignSystemBridge>
  </SettingsProvider>,
);
