import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { scan } from 'react-scan';

import App from './App';

import './styles/index.css';

scan({ enabled: true, log: false, showToolbar: true, dangerouslyForceRunInProduction: true });

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>,
);
