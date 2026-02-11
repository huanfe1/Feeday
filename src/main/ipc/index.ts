import type { SettingsSchema } from '@shared/types/settings';

import { fetchFeed } from '@/lib/rss';
import { settings } from '@/lib/settings';
import { ipcMain } from '@/lib/utils';

import './db';
import './opml';

ipcMain.handle('fetch-feed-info', async (_event, url) => {
    try {
        return await fetchFeed(url);
    } catch (error) {
        throw new Error(`获取订阅源信息失败: ${(error as Error).message}`);
    }
});

ipcMain.handle('settings-get', <T extends keyof SettingsSchema>(_, key: T) => settings.get(key));
ipcMain.handle('settings-update', <T extends keyof SettingsSchema>(_, key: T, value: SettingsSchema[T]) => settings.set(key, value));
