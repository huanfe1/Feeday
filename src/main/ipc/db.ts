import { db, insertPost } from '@/database';
import { ipcMain } from 'electron';
import { toString } from 'hast-util-to-string';
import rehypeParse from 'rehype-parse';
import { unified } from 'unified';

import { truncate } from '@/lib/utils';

// Feeds

ipcMain.handle('db-get-feeds', async () => {
    const sql = `
    SELECT
        f.id, 
        f.title, 
        f.link, 
        f.url, 
        f.icon, 
        f.fetch_frequency, 
        f.folder_id, 
        f.view, 
        f.last_fetch_error, 
        CASE WHEN COUNT(p.id) > 0 THEN 1 ELSE 0 END AS has_unread 
    FROM feeds f
    LEFT JOIN posts p ON p.feed_id = f.id AND p.is_read = 0
    GROUP BY f.id, f.title, f.link, f.url, f.icon, f.fetch_frequency, f.folder_id, f.view, f.last_fetch_error
    ORDER BY f.title ASC;`;
    const select = db.prepare(sql);
    const avatar_proxy = db.prepare("SELECT value FROM settings WHERE key = 'avatar_proxy'").get()!.value as string;
    return select.all().map(feed => ({
        ...feed,
        icon: feed.icon ? feed.icon : avatar_proxy.replace('${url}', new URL(feed.link as string).hostname),
    }));
});

ipcMain.handle('db-insert-feed', async (_event, feed) => {
    const insert = db.prepare(
        'INSERT INTO feeds (title, description, link, url, last_updated, icon, folder_id, view) VALUES ($title, $description, $link, $url, $last_updated, $icon, $folder_id, $view)',
    );
    const { lastInsertRowid } = insert.run(feed);
    return lastInsertRowid;
});

ipcMain.handle('db-update-feed', async (_event, feed) => {
    const update = db.prepare('UPDATE feeds SET title = $title, link = $link, fetch_frequency = $fetch_frequency, folder_id = $folder_id, view = $view WHERE id = $id');
    return update.run(feed);
});

ipcMain.handle('db-delete-feed', async (_event, feedId: number) => {
    const del = db.prepare('DELETE FROM feeds WHERE id = ?');
    return del.run(feedId);
});

ipcMain.handle('db-insert-post', async (_event, feed_id: number, post) => {
    return insertPost(feed_id, post);
});

// Posts

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
        if (view === 2) return summary;
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

// Folders

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
