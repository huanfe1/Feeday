import { getIconCollections, iconsPlugin } from '@egoist/tailwindcss-icons';

/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    theme: {
        extend: {},
    },
    plugins: [
        iconsPlugin({
            collections: getIconCollections(['mingcute']),
        }),
    ],
};
