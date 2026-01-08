import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App';

import './styles/index.css';

if (import.meta.env.DEV) {
    const { scan } = await import('react-scan');
    scan({ enabled: false, log: false, showToolbar: true });
}

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>,
);
