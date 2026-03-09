import type { SettingsSchema } from '@shared/types/settings';

import { fetchFeed } from '@/lib/rss';
import { settings } from '@/lib/settings';
import { ipcMain } from '@/lib/utils';

import './db';
import './opml';

let fetchFeedAbortController: AbortController | null = null;

ipcMain.on('cancel-fetch-feed-info', () => {
    if (fetchFeedAbortController) {
        fetchFeedAbortController.abort();
        fetchFeedAbortController = null;
    }
});

ipcMain.handle('fetch-feed-info', async (_event, url) => {
    if (fetchFeedAbortController) {
        fetchFeedAbortController.abort();
    }
    fetchFeedAbortController = new AbortController();

    try {
        return await fetchFeed(url, { signal: fetchFeedAbortController.signal });
    } catch (error) {
        if ((error as Error).name === 'AbortError') {
            throw new Error('请求已取消');
        }
        throw new Error(`获取订阅源信息失败: ${(error as Error).message}`);
    } finally {
        fetchFeedAbortController = null;
    }
});

ipcMain.handle('settings-get', <T extends keyof SettingsSchema>(_, key: T) => settings.get(key));
ipcMain.handle('settings-update', <T extends keyof SettingsSchema>(_, key: T, value: SettingsSchema[T]) => settings.set(key, value));
