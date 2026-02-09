import { db, dbMethods } from '@/database';
import { dialog, ipcMain } from 'electron';

import { type FeedItem, parseOpmlContent } from '@/lib/opml';
import { fetchFeed } from '@/lib/rss';

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

    return new Promise<boolean>(resolve => {
        db.transaction()
            .execute(async trx => {
                let folderId: number | undefined = undefined;
                folderId = await trx
                    .selectFrom('folders')
                    .select(['id'])
                    .where('name', '=', feed.folder as string)
                    .executeTakeFirst()
                    .then(row => row?.id);
                if (!folderId) {
                    folderId = await trx
                        .insertInto('folders')
                        .values({ name: feed.folder as string })
                        .returning('id')
                        .executeTakeFirst()
                        .then(row => row?.id);
                }
                if (!feed.title || !feed.link || !feed.url) return false;
                const { id: feedId } = await trx
                    .insertInto('feeds')
                    .values({
                        title: feed.title,
                        description: feed.description,
                        link: feed.link,
                        url: feed.url,
                        lastUpdated: feed.lastUpdated,
                        icon: feed.icon,
                        folderId: folderId,
                    })
                    .returning('id')
                    .executeTakeFirstOrThrow();

                await Promise.all(items?.map(item => dbMethods.insertPost(feedId as number, item)) ?? []);
                resolve(true);
            })
            .catch(() => {
                resolve(false);
            });
    });
}

ipcMain.handle('import-opml-feeds', async (event, feeds: FeedItem[]) => {
    const maxParallel = 5;
    let index = 0;
    const insertPromises: Promise<boolean>[] = [];

    const findFeed = db.selectFrom('feeds').select(['id']);

    async function fetchNext(): Promise<void> {
        if (index >= feeds.length) {
            return;
        }

        const feed = feeds[index];
        index += 1;

        if (!feed.url || (await findFeed.where('url', '=', feed.url).executeTakeFirst())) {
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
