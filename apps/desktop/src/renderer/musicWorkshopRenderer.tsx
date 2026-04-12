import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import CreatorsWorkshop from './windows/MusicWorkshop/CreatorsWorkshop';
import { SettingsProvider } from '@renderer/core/config/SettingsContext';
import '@renderer/styles/tokens.material.css';
import DesignSystemBridge from '@renderer/designSystem/DesignSystemBridge';
import { ensureWeb3Modal } from '@renderer/core/web3/bootstrap';
import { musicWorkshopStore } from './windows/MusicWorkshop/hooks/workshopStore';

ensureWeb3Modal();

console.log('[FreeFlow] : Creators Workshop Renderer execution started');

createRoot(document.getElementById('app')!).render(
  <SettingsProvider>
    <Provider store={musicWorkshopStore}>
      <DesignSystemBridge>
        <CreatorsWorkshop />
      </DesignSystemBridge>
    </Provider>
  </SettingsProvider>,
);
