/// <reference types="vite/client" />
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { parseWatchShareId } from './utils/entryRouting';
import 'katex/dist/katex.min.css';
import './index.css';

async function bootstrap() {
  const rootEl = document.getElementById('root')!;
  if (
    import.meta.env.DEV &&
    new URLSearchParams(window.location.search).get('r2test') === '1'
  ) {
    const { R2LiveTestPage } = await import('./dev/R2LiveTestPage');
    ReactDOM.createRoot(rootEl).render(
      <React.StrictMode>
        <R2LiveTestPage />
      </React.StrictMode>
    );
    return;
  }

  const watchShareId = parseWatchShareId(
    window.location.pathname,
    window.location.search,
    window.location.hash
  );
  if (watchShareId) {
    const { WatchPlayerPage } = await import('./components/WatchPlayerPage');
    ReactDOM.createRoot(rootEl).render(
      <React.StrictMode>
        <WatchPlayerPage shareId={watchShareId} />
      </React.StrictMode>
    );
    return;
  }

  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <AuthProvider>
        <App />
      </AuthProvider>
    </React.StrictMode>
  );
}

void bootstrap();

