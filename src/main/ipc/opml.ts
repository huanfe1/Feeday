import { db, insertPost } from '@/database';
import { dialog, ipcMain } from 'electron';

import type { PostType } from '@/database/types';
import { type FeedItem, parseOpmlContent } from '@/lib/opml';
import { fetchFeed } from '@/lib/rss';
import { undefined2null } from '@/lib/utils';

ipcMain.handle('opml-select-file-dialog', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'OPML Files', extensions: ['opml', 'xml'] }],
    });
    if (result.canceled) {
        return null;
    }
    return result.filePaths[0];
});

ipcMain.handle('opml-parse-content', async (_event, content: string) => {
    try {
        const feeds = parseOpmlContent(content);
        return { success: true, feeds };
    } catch (error) {
        return { success: false, error: (error as Error).message, feeds: [] };
    }
});

async function insertFeedToDatabase(result: Awaited<ReturnType<typeof fetchFeed>> & { folder?: string }): Promise<boolean> {
    const { items, ...feed } = result;

    db.exec('BEGIN TRANSACTION');
    try {
        let folderId: number | null = null;
        if (feed.folder) {
            const getFolderByName = db.prepare(`SELECT id FROM folders WHERE name = '${feed.folder}'`);
            folderId = getFolderByName.get()?.id as number | null;
            if (!folderId) {
                const insert = db.prepare('INSERT INTO folders (name) VALUES (?)');
                const { lastInsertRowid } = insert.run(feed.folder);
                folderId = lastInsertRowid as number;
            }
        }

        const insert = db.prepare(
            'INSERT INTO feeds (title, description, link, url, last_updated, icon, folder_id, last_fetch_error) VALUES ($title, $description, $link, $url, $last_updated, $icon, $folder_id, $last_fetch_error)',
        );
        const { lastInsertRowid } = insert.run(
            undefined2null({
                title: feed.title,
                description: feed.description,
                link: feed.link,
                url: feed.url,
                last_updated: feed.last_updated,
                icon: feed.icon,
                folder_id: folderId,
                last_fetch_error: feed.last_fetch_error,
            }),
        );

        db.exec('COMMIT');

        if (items) {
            try {
                await Promise.all(items.map(item => insertPost(lastInsertRowid as number, undefined2null(item) as PostType)));
            } catch (error: unknown) {
                if (error instanceof Error) {
                    console.log(`Failed to insert posts for feed ${feed.title}:`, error.message);
                }
            }
        }
        return true;
    } catch (error: unknown) {
        db.exec('ROLLBACK');
        if (error instanceof Error) {
            console.log(feed.title, error.message);
        }
        return false;
    }
}

ipcMain.handle('import-opml-feeds', async (event, feeds: FeedItem[]) => {
    const maxParallel = 5;
    let index = 0;
    const insertPromises: Promise<boolean>[] = [];

    const findFeedSql = db.prepare('SELECT id FROM feeds WHERE url = ?');

    async function fetchNext(): Promise<void> {
        if (index >= feeds.length) {
            return;
        }

        const feed = feeds[index];
        index += 1;

        if (!feed.url || findFeedSql.get(feed.url)) {
            return fetchNext();
        }

        try {
            const result = await fetchFeed(feed.url, 10000);
            insertPromises.push(insertFeedToDatabase({ ...feed, ...result }));
        } catch (error: unknown) {
            if (error instanceof Error) {
                insertPromises.push(insertFeedToDatabase({ ...feed, last_fetch_error: error.message }));
            }
        }

        return fetchNext();
    }

    const fetchPromises: Promise<void>[] = [];
    for (let i = 0; i < maxParallel; i += 1) {
        fetchPromises.push(fetchNext());
    }

    await Promise.all(fetchPromises);

    const insertResults = await Promise.all(insertPromises);
    const successCount = insertResults.filter(result => result === true).length;

    console.log(`OPML 导入完成，成功插入 ${successCount} 个订阅源`);

    event.sender.send('opml-import-complete', { insertedFeeds: successCount });
});
