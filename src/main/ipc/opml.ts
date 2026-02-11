import { db, dbMethods } from '@/database';
import { dialog } from 'electron';
import { readFileSync } from 'node:fs';
import pLimit from 'p-limit';

import { parseOpmlContent } from '@/lib/opml';
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

                const feed = { ...fetchFeedData, ...opmlFeedWithoutFolderName, folderId };
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
                            await dbMethods.insertPost(feedId, { ...postData, title, link });
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

async function getFolderId(folderName?: string): Promise<number | undefined> {
    if (!folderName) return;
    const folder = await db.selectFrom('folders').select(['id']).where('name', '=', folderName).executeTakeFirst();
    if (folder?.id) return folder.id;
    const newFolder = await db.insertInto('folders').values({ name: folderName }).returning('id').executeTakeFirst();
    return newFolder!.id!;
}
