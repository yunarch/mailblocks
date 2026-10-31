import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { AppContextProvider } from './providers/AppContextProvider';
import './styles/index.css';

// Cloudflare Web Analytics integration for production builds
const analyticsToken = import.meta.env.VITE_CLOUDFLARE_ANALYTICS_TOKEN;
if (import.meta.env.PROD && analyticsToken) {
  const analyticsScript = document.createElement('script');
  analyticsScript.defer = true;
  analyticsScript.src = 'https://static.cloudflareinsights.com/beacon.min.js';
  analyticsScript.dataset.cfBeacon = JSON.stringify({ token: analyticsToken });
  document.body.append(analyticsScript);
}

// Render the React app into the root element
createRoot(document.querySelector('#root') as never as Element).render(
  <StrictMode>
    <AppContextProvider>
      <App />
    </AppContextProvider>
  </StrictMode>
);
