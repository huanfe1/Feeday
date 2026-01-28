import { db, insertPost } from '@main/database';
import { type OPMLFeed, parseOPML, parseOPMLFromContent } from '@main/lib/opml';
import { fetchFeed } from '@main/lib/rss';
import { truncate } from '@main/lib/utils';
import { dialog, ipcMain } from 'electron';
import { toString } from 'hast-util-to-string';
import rehypeParse from 'rehype-parse';
import { unified } from 'unified';

import type { PostType } from './types';

ipcMain.handle('get-feed-info', async (_event, feedUrl: string) => {
    try {
        return await fetchFeed(feedUrl);
    } catch (error) {
        throw new Error(`获取订阅源信息失败: ${(error as Error).message}`);
    }
});

ipcMain.handle('db-get-feeds', async () => {
    const select = db.prepare(
        'SELECT f.id, f.title, f.link, f.url, f.icon, f.fetch_frequency, f.folder_id, fo.name AS folder_name, f.view, f.last_fetch_error, EXISTS (SELECT 1 FROM posts p WHERE p.feed_id = f.id AND p.is_read = 0) AS has_unread FROM feeds f LEFT JOIN folders fo ON f.folder_id = fo.id ORDER BY (fo.name IS NULL), fo.name ASC, f.title ASC',
    );
    const avatar_proxy = db.prepare("SELECT value FROM settings WHERE key = 'avatar_proxy'").get()!.value as string;
    return select.all().map(feed => ({
        ...feed,
        icon: feed.icon ? feed.icon : avatar_proxy.replace('${url}', new URL(feed.link as string).hostname),
    }));
});

ipcMain.handle('db-insert-feed', async (_event, feed) => {
    const insert = db.prepare(
        'INSERT INTO feeds (title, description, link, url, last_updated, icon, folder_id) VALUES ($title, $description, $link, $url, $last_updated, $icon, $folder_id)',
    );
    const { lastInsertRowid } = insert.run(feed);
    return lastInsertRowid;
});

ipcMain.handle('db-update-feed', async (_event, feed) => {
    const update = db.prepare('UPDATE feeds SET title = $title, link = $link, fetch_frequency = $fetch_frequency, folder_id = $folder_id WHERE id = $id');
    return update.run(feed);
});

ipcMain.handle('db-delete-feed', async (_event, feedId: number) => {
    const del = db.prepare('DELETE FROM feeds WHERE id = ?');
    return del.run(feedId);
});

ipcMain.handle('db-insert-post', async (_event, feed_id: number, post: PostType) => {
    return insertPost(feed_id, post);
});

type GetPostsParams = {
    onlyUnread: boolean;
    feedId?: number;
    folderId?: number;
    view: number;
};
ipcMain.handle('db-get-posts', async (_event, params: GetPostsParams) => {
    const { onlyUnread, feedId, folderId, view } = params;

    // 构建 WHERE 条件
    const conditions: string[] = [];
    const values: number[] = [];

    if (onlyUnread) {
        conditions.push('p.is_read = 0');
    }

    if (feedId !== undefined && feedId !== null) {
        conditions.push('p.feed_id = ?');
        values.push(feedId);
    }

    // 构建 SQL 语句
    let sql = 'SELECT p.id, p.title, p.link, p.summary, p.feed_id, p.author, p.pub_date, p.is_read, p.image_url, p.podcast FROM posts p';

    // 如果需要 folderId 或 view，需要 JOIN feeds 表
    const needsJoinFeeds = (folderId !== undefined && folderId !== null) || (view !== undefined && view !== null);

    if (needsJoinFeeds) {
        sql += ' INNER JOIN feeds f ON p.feed_id = f.id';
    }

    if (folderId !== undefined && folderId !== null) {
        conditions.push('f.folder_id = ?');
        values.push(folderId);
    }

    if (view !== undefined && view !== null) {
        conditions.push('f.view = ?');
        values.push(view);
    }

    if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY p.is_read ASC, p.pub_date DESC';

    const select = db.prepare(sql);
    const getSummary = (summary: string) => {
        if (!summary) return '';
        const result = unified().use(rehypeParse, { fragment: true }).parse(summary.slice(0, 500));
        return truncate(toString(result));
    };
    return select.all(...values).map(post => ({ ...post, summary: getSummary(post.summary as string) }));
});

ipcMain.handle('db-get-post-content-by-id', async (_event, postId: number) => {
    const select = db.prepare('SELECT p.summary, pc.content FROM posts As p LEFT JOIN post_contents As pc ON p.id = pc.post_id WHERE p.id = ?');
    return select.get(postId);
});

ipcMain.handle('db-update-post-read-by-id', async (_event, post_id: number, is_read: boolean) => {
    const update = db.prepare('UPDATE posts SET is_read = $is_read WHERE id = $post_id');
    return update.run({ post_id: post_id, is_read: is_read ? 1 : 0 });
});

ipcMain.handle('db-read-all-posts', async (_event, feed_id?: number, folder_id?: number) => {
    let sql: string;
    if (folder_id) {
        sql = `UPDATE posts SET is_read = 1 WHERE feed_id IN (SELECT id FROM feeds WHERE folder_id = ${folder_id})`;
    } else if (feed_id) {
        sql = `UPDATE posts SET is_read = 1 WHERE feed_id = ${feed_id}`;
    } else {
        sql = `UPDATE posts SET is_read = 1 WHERE is_read = 0`;
    }
    const update = db.prepare(sql);
    return update.run();
});

// folders

ipcMain.handle('db-get-folders', async () => {
    const select = db.prepare('SELECT id, name FROM folders ORDER BY name ASC');
    return select.all();
});

ipcMain.handle('db-insert-folder', async (_event, folder_name) => {
    const insert = db.prepare('INSERT INTO folders (name) VALUES (?)');
    return insert.run(folder_name);
});

ipcMain.handle('db-update-folder', async (_event, folder_id: number, folder_name: string) => {
    const update = db.prepare('UPDATE folders SET name = ? WHERE id = ?');
    return update.run(folder_name, folder_id);
});

ipcMain.handle('db-delete-folder', async (_event, folderId: number) => {
    const del = db.prepare('DELETE FROM folders WHERE id = ?');
    return del.run(folderId);
});

// OPML import
ipcMain.handle('parse-opml-file', async (_event, filePath: string) => {
    try {
        const feeds = parseOPML(filePath);
        return { success: true, feeds };
    } catch (error) {
        return { success: false, error: (error as Error).message, feeds: [] };
    }
});

ipcMain.handle('parse-opml-content', async (_event, content: string) => {
    try {
        const feeds = parseOPMLFromContent(content);
        return { success: true, feeds };
    } catch (error) {
        return { success: false, error: (error as Error).message, feeds: [] };
    }
});

ipcMain.handle('show-opml-file-dialog', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'OPML Files', extensions: ['opml', 'xml'] }],
    });
    if (result.canceled) {
        return null;
    }
    return result.filePaths[0];
});

ipcMain.handle('import-opml-feeds', async (_event, feeds: OPMLFeed[]) => {
    const insertFeed = db.prepare(
        'INSERT INTO feeds (title, description, link, url, last_updated, icon, folder_id) VALUES ($title, $description, $link, $url, $last_updated, $icon, $folder_id)',
    );
    const getFolderByName = db.prepare('SELECT id FROM folders WHERE name = ?');
    const insertFolder = db.prepare('INSERT INTO folders (name) VALUES (?)');

    const results = {
        success: 0,
        failed: 0,
        skipped: 0,
        errors: [] as Array<{ title: string; error: string }>,
    };

    // 创建文件夹映射
    const folderMap = new Map<string, number | null>();

    // 处理单个 feed 的函数
    const processFeed = async (opmlFeed: OPMLFeed): Promise<void> => {
        // 处理文件夹（文件夹操作不需要事务，因为它们是共享资源）
        let folderId: number | null = null;
        if (opmlFeed.folder) {
            if (!folderMap.has(opmlFeed.folder)) {
                // 尝试获取现有文件夹
                const existingFolder = getFolderByName.get(opmlFeed.folder) as { id: number } | undefined;
                if (existingFolder) {
                    folderMap.set(opmlFeed.folder, existingFolder.id);
                    folderId = existingFolder.id;
                } else {
                    // 创建新文件夹
                    try {
                        const { lastInsertRowid } = insertFolder.run(opmlFeed.folder);
                        folderMap.set(opmlFeed.folder, lastInsertRowid as number);
                        folderId = lastInsertRowid as number;
                    } catch (error) {
                        // 如果文件夹已存在（并发情况），再次查询
                        const existingFolder = getFolderByName.get(opmlFeed.folder) as { id: number } | undefined;
                        if (existingFolder) {
                            folderMap.set(opmlFeed.folder, existingFolder.id);
                            folderId = existingFolder.id;
                        } else {
                            throw error;
                        }
                    }
                }
            } else {
                folderId = folderMap.get(opmlFeed.folder) ?? null;
            }
        }

        // 获取 feed 信息（带超时控制）
        let feedInfo: Awaited<ReturnType<typeof fetchFeed>> | null = null;
        try {
            feedInfo = await fetchFeed(opmlFeed.xmlUrl, 10000); // 10 秒超时
        } catch (error) {
            // 如果获取 feed 信息失败，使用 OPML 中的基本信息
            console.warn(`无法获取 feed 信息 ${opmlFeed.xmlUrl}:`, error);
        }

        // 为每个 feed 的插入操作创建独立的事务
        // 注意：insertPost 内部管理自己的事务，所以文章的插入是独立的
        db.exec('BEGIN TRANSACTION');
        try {
            // 插入 feed
            const { lastInsertRowid } = insertFeed.run({
                title: opmlFeed.title || feedInfo?.title || '未命名订阅源',
                description: feedInfo?.description || null,
                link: opmlFeed.htmlUrl || feedInfo?.link || opmlFeed.xmlUrl,
                url: feedInfo?.url || opmlFeed.xmlUrl,
                last_updated: feedInfo?.last_updated || null,
                icon: feedInfo?.icon || null,
                folder_id: folderId,
            });

            db.exec('COMMIT');

            // 插入文章（insertPost 内部管理自己的事务）
            if (feedInfo?.items) {
                for (const item of feedInfo.items) {
                    try {
                        insertPost(lastInsertRowid as number, item as PostType);
                    } catch {
                        // 忽略文章插入错误（可能是重复文章）
                    }
                }
            }
        } catch (error) {
            db.exec('ROLLBACK');
            throw error;
        }
    };

    // 分批并行处理，每批处理 5 个 feed，避免过多并发请求
    // 注意：不使用全局事务，因为 insertPost 内部管理自己的事务
    // 每个 feed 的插入操作是独立的，失败不影响其他
    const batchSize = 5;

    for (let i = 0; i < feeds.length; i += batchSize) {
        const batch = feeds.slice(i, i + batchSize);
        // 使用 Promise.allSettled 并行处理一批 feed，即使某个失败也不影响其他
        const batchResults = await Promise.allSettled(batch.map(opmlFeed => processFeed(opmlFeed)));

        // 处理每个 feed 的结果
        batch.forEach((opmlFeed, index) => {
            const result = batchResults[index];
            if (result.status === 'fulfilled') {
                results.success++;
            } else {
                const error = result.reason;
                const errorMessage = error instanceof Error ? error.message : String(error);
                if (errorMessage.includes('UNIQUE constraint failed: feeds.url') || errorMessage.includes('UNIQUE constraint failed: feeds.link')) {
                    results.skipped++;
                } else {
                    results.failed++;
                    results.errors.push({
                        title: opmlFeed.title || opmlFeed.xmlUrl,
                        error: errorMessage,
                    });
                }
            }
        });
    }

    return results;
});
