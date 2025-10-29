import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Route, Routes } from 'react-router-dom';
import Application from './Application';

import { SettingsProvider } from '@renderer/core/config/SettingsContext';

import '@renderer/styles/tokens.material.css';
import DesignSystemBridge from '@renderer/designSystem/DesignSystemBridge';

console.log('[FreeFlow] : Renderer execution started');

createRoot(document.getElementById('app')!).render(
  <SettingsProvider>
    <DesignSystemBridge>
      <HashRouter>
        <Routes>
          <Route path="/*" element={<Application />} />
        </Routes>
      </HashRouter>
    </DesignSystemBridge>
  </SettingsProvider>,
);
