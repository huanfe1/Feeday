import { ipcMain } from 'electron';

import { fetchFeed } from '@/lib/rss';

import './db';
import './opml';

ipcMain.handle('fetch-feed-info', async (_event, url: string) => {
    try {
        return await fetchFeed(url);
    } catch (error) {
        throw new Error(`获取订阅源信息失败: ${(error as Error).message}`);
    }
});
