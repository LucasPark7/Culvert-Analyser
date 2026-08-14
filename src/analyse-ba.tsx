import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import AppBA from './AppBA';
import './styles/main.css';
const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');

createRoot(rootElement).render(
  <StrictMode>
    <AppBA />
  </StrictMode>
);
