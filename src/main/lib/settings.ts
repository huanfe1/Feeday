import type { SettingsSchema } from '@shared/types/settings';
import Store from 'electron-store';
import type { Schema } from 'electron-store';

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
        default: 'https://unavatar.webp.se/${url}',
        format: 'url',
    },
    proxy: {
        type: 'string',
        default: '',
    },
} as const;

export const settings = new Store<SettingsSchema>({ schema });
