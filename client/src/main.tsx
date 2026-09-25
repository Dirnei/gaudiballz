import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './i18n/i18n';
// Before the app: tells a first visit from a returning player before identity is created.
import './changelog/seen';
import './index.css';
import { App } from './game/App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
