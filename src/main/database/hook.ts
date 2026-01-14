import { db, insertPost } from '@main/database';
import { fetchFeed } from '@main/lib/rss';
import { ipcMain } from 'electron';

ipcMain.handle('get-feed-info', async (_event, feedUrl: string) => {
    try {
        return await fetchFeed(feedUrl);
    } catch (error) {
        throw new Error(`获取订阅源信息失败: ${(error as Error).message}`);
    }
});

ipcMain.handle('db-get-feeds', async () => {
    const select = db.prepare(
        'SELECT f.id, f.title, f.link, f.url, f.icon, f.fetch_frequency, f.folder_id, fo.name AS folder_name, EXISTS (SELECT 1 FROM posts p WHERE p.feed_id = f.id AND p.is_read = 0) AS has_unread FROM feeds f LEFT JOIN folders fo ON f.folder_id = fo.id ORDER BY (fo.name IS NULL), fo.name ASC, f.title ASC',
    );
    return select.all();
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

ipcMain.handle('db-insert-post', async (_event, post) => {
    return insertPost(post);
});

ipcMain.handle('db-get-posts', async (_event, only_unread: boolean = false) => {
    const select = db.prepare(
        `SELECT p.id, p.title, p.link, p.summary, p.feed_id, f.title as author, p.pub_date, p.is_read FROM posts p LEFT JOIN feeds f ON f.id = p.feed_id ${only_unread ? 'WHERE p.is_read = 0' : ''} ORDER BY p.is_read ASC, p.pub_date DESC LIMIT 30`,
    );
    return select.all();
});

ipcMain.handle('db-get-posts-by-id', async (_event, feedId: number, only_unread: boolean = false) => {
    const select = db.prepare(
        `SELECT p.id, p.title, p.link, p.summary, p.feed_id, f.title as author, p.pub_date, p.is_read FROM posts p LEFT JOIN feeds f ON f.id = p.feed_id WHERE p.feed_id = ? ${only_unread ? 'AND p.is_read = 0' : ''} ORDER BY p.is_read ASC, p.pub_date DESC LIMIT 30`,
    );
    return select.all(feedId);
});

ipcMain.handle('db-get-post-content-by-id', async (_event, postId: number) => {
    const select = db.prepare('SELECT p.summary, pc.content FROM posts As p LEFT JOIN post_contents As pc ON p.id = pc.post_id WHERE p.id = ?');
    return select.get(postId);
});

ipcMain.handle('db-update-post-read-by-id', async (_event, post_id: number, is_read: boolean) => {
    const update = db.prepare('UPDATE posts SET is_read = $is_read WHERE id = $post_id');
    return update.run({ post_id: post_id, is_read: is_read ? 1 : 0 });
});

ipcMain.handle('db-read-all-posts', async (_event, feed_id?: number) => {
    const update = db.prepare(`UPDATE posts SET is_read = 1 WHERE ${feed_id ? 'feed_id = ' + feed_id : 'is_read = 0'}`);
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
