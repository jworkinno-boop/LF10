import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AppStateProvider } from './state/AppStateProvider';
import { App } from './App';
import './index.css';

const container = document.getElementById('root');
if (!container) throw new Error('Missing #root');

createRoot(container).render(
  <StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppStateProvider>
        <App />
      </AppStateProvider>
    </BrowserRouter>
  </StrictMode>,
);
