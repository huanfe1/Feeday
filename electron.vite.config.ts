import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { codeInspectorPlugin } from 'code-inspector-plugin';
import { defineConfig } from 'electron-vite';
import { resolve } from 'path';

export default defineConfig({
    main: {
        resolve: {
            alias: {
                '@': resolve(__dirname, './src/main'),
            },
        },
    },
    preload: {},
    renderer: {
        resolve: {
            alias: {
                '@': resolve(__dirname, './src/renderer/src'),
            },
        },
        plugins: [react(), tailwindcss(), codeInspectorPlugin({ bundler: 'vite', behavior: { locate: false, copy: true } })],
    },
});
