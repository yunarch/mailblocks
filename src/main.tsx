import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { AppContextProvider } from './providers/AppContextProvider';
import './styles/index.css';

createRoot(document.querySelector('#root') as never as Element).render(
  <StrictMode>
    <AppContextProvider>
      <App />
    </AppContextProvider>
  </StrictMode>
);
