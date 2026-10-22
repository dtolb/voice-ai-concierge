import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from '@gtmi/strix-react/theme';
import { App } from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider initialTheme="dark">
      <App />
    </ThemeProvider>
  </StrictMode>
);
