import React from 'react';
import { createRoot } from 'react-dom/client';
import { ensureWeb3Modal } from '@renderer/core/web3/bootstrap';
import ProfileGuide from '@renderer/windows/ProfileGuide/ProfileGuide';
import '@renderer/styles/tokens.material.css';

ensureWeb3Modal();

console.log('[FreeFlow] : Profile Guide Renderer execution started');

createRoot(document.getElementById('app')!).render(
  <ProfileGuide />,
);
