import { db, dbMethods } from '@/database';
import type { Podcast } from '@shared/types/database';
import { dialog } from 'electron';
import { readFileSync, writeFileSync } from 'node:fs';
import pLimit from 'p-limit';

import { buildOpmlContent, parseOpmlContent } from '@/lib/opml';
import { fetchFeed } from '@/lib/rss';
import { ipcMain } from '@/lib/utils';

ipcMain.handle('opml-select-file-dialog', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'OPML Files', extensions: ['opml', 'xml'] }],
    });
    if (result.canceled) {
        return null;
    }
    return readFileSync(result.filePaths[0], { encoding: 'utf-8' });
});

const fetchLimit = pLimit(5);
const writeLimit = pLimit(1);
ipcMain.handle('opml-import-from-content', async (_event, content) => {
    const opmlFeeds = parseOpmlContent(content);
    const tasks = opmlFeeds.map(opmlFeed => {
        return fetchLimit(async () => {
            try {
                const { feed: fetchFeedData, posts: fetchPostsData } = await fetchFeed(opmlFeed.url);
                const { folderName, ...opmlFeedWithoutFolderName } = opmlFeed;
                const folderId = await getFolderId(folderName);

                const feed = { ...fetchFeedData, ...opmlFeedWithoutFolderName, folderId, type: 0 as const };
                if (!feed?.title || !feed?.link || !feed?.url) {
                    throw new Error('Feed 缺少必要字段 (title/link/url)');
                }

                const feedId = await dbMethods.insertFeed(feed);
                if (!feedId || !fetchPostsData || fetchPostsData.length === 0) {
                    throw new Error('无法插入 Feed 或 Feed 已存在');
                }

                await Promise.allSettled(
                    fetchPostsData.map(post => {
                        return writeLimit(async () => {
                            const { title, link, ...postData } = post;
                            if (!title || !link) return;
                            await dbMethods.insertPost(feedId, {
                                ...postData,
                                title,
                                link,
                                content: postData.content ?? null,
                                podcast: postData.podcast && typeof postData.podcast === 'object' && 'url' in postData.podcast ? (postData.podcast as Podcast) : undefined,
                            });
                        });
                    }),
                );
                return { success: true, message: `${feed.title} 导入成功` };
            } catch (error: unknown) {
                return { success: false, message: `导入失败: ${(error as Error)?.message ?? String(error)}` };
            }
        });
    });

    return Promise.allSettled(tasks);
});

ipcMain.handle('opml-export-feeds', async () => {
    const feedsWithFolders = await db
        .selectFrom('feeds')
        .leftJoin('folders', 'feeds.folderId', 'folders.id')
        .select(['feeds.title', 'feeds.url', 'feeds.link', 'folders.name as folderName'])
        .execute();

    if (feedsWithFolders.length === 0) {
        return { success: false, message: '没有可导出的订阅源' };
    }

    const exportFeeds = feedsWithFolders.map(f => ({
        title: f.title,
        url: f.url,
        link: f.link,
        folderName: f.folderName ?? undefined,
    }));

    const opmlContent = buildOpmlContent(exportFeeds);

    const result = await dialog.showSaveDialog({
        defaultPath: `Feeday-feeds-${new Date().toISOString().slice(0, 10)}.opml`,
        filters: [{ name: 'OPML Files', extensions: ['opml', 'xml'] }],
    });

    if (result.canceled || !result.filePath) {
        return { success: false, canceled: true };
    }

    try {
        writeFileSync(result.filePath, opmlContent, { encoding: 'utf-8' });
        return { success: true, message: `成功导出 ${feedsWithFolders.length} 个订阅源` };
    } catch (error) {
        return { success: false, message: `导出失败: ${(error as Error)?.message ?? String(error)}` };
    }
});

async function getFolderId(folderName?: string): Promise<number | undefined> {
    if (!folderName) return;
    const folder = await db.selectFrom('folders').select(['id']).where('name', '=', folderName).executeTakeFirst();
    if (folder?.id) return folder.id;
    const newFolder = await db.insertInto('folders').values({ name: folderName }).returning('id').executeTakeFirst();
    return newFolder!.id!;
}
