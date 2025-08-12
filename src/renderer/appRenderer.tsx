import React from 'react';
import { createRoot } from 'react-dom/client';
import Application from './components/Application';
import { HashRouter, Route, Routes } from 'react-router-dom';

import PreferenceWindow from '@components/PreferenceWindow/PreferenceWindow';

// Say something
console.log('[FreeFlow] : Renderer execution started');

// Render application in DOM
createRoot(document.getElementById('app')).render(
  <HashRouter>
    <Routes>
      <Route path="/" element={
        <Application />
      } />
      <Route path="/settings" element={<PreferenceWindow />} />
    </Routes>
  </HashRouter>,
);

