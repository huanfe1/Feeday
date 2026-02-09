import Store from 'electron-store';
import type { Schema } from 'electron-store';

interface SettingsSchema {
    windowWidth: number;
    windowHeight: number;
    isMaximized: boolean;
    rsshubSource: string;
    avatarProxy: string;
}

const schema: Schema<SettingsSchema> = {
    windowWidth: {
        type: 'number',
        default: 1280,
    },
    windowHeight: {
        type: 'number',
        default: 720,
    },
    isMaximized: {
        type: 'boolean',
    },
    rsshubSource: {
        type: 'string',
        default: 'https://rsshub.app',
        format: 'url',
    },
    avatarProxy: {
        type: 'string',
        default: 'https://unavatar.webp.se/',
        format: 'url',
    },
} as const;

export const settings = new Store<SettingsSchema>({ schema });
