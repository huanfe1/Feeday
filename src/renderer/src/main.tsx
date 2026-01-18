import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App';

import './styles/index.css';

if (import.meta.env.DEV) {
    // const { default: whyDidYouRender } = await import('@welldone-software/why-did-you-render');
    // const { default: React } = await import('react');
    // whyDidYouRender(React, {
    //     // trackAllPureComponents: true,
    //     trackHooks: true,
    //     logOnDifferentValues: true,
    //     collapseGroups: true,
    //     include: [/^Sidebar$/],
    // });

    import('react-scan').then(({ scan }) => {
        scan({ enabled: false, log: false, showToolbar: true });
    });
}

// 渲染应用
createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>,
);
