import { ipcMain } from 'electron';
import { readFileSync } from 'fs';

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

ipcMain.handle('fs-read-file', async (_event, filePath: string, encoding: BufferEncoding = 'utf-8') => {
    return readFileSync(filePath, { encoding: encoding });
});
