import { db, insertPost } from '@main/database';
import { fetchFeed } from '@main/lib/rss';
import { ipcMain } from 'electron';

ipcMain.handle('get-feed-info', async (_event, feedUrl: string) => {
    try {
        return await fetchFeed(feedUrl);
    } catch (error: any) {
        throw new Error(`获取订阅源信息失败: ${error.message}`);
    }
});

ipcMain.handle('db-get-feeds', async _event => {
    const select = db.prepare(
        'SELECT f.id, f.title, f.link, f.url, f.icon, EXISTS (SELECT 1 FROM posts p WHERE p.feed_id = f.id AND p.is_read = 0) AS has_unread FROM feeds f ORDER BY f.title ASC',
    );
    return select.all();
});

ipcMain.handle('db-insert-feed', async (_event, feed) => {
    const insert = db.prepare('INSERT INTO feeds (title, description, link, url, last_updated, icon) VALUES ($title, $description, $link, $url, $last_updated, $icon)');
    const { lastInsertRowid } = insert.run(feed);
    return lastInsertRowid;
});

ipcMain.handle('db-update-feed', async (_event, feed) => {
    const update = db.prepare('UPDATE feeds SET title = $title, link = $link, fetch_frequency = $fetch_frequency WHERE id = $id');
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

ipcMain.handle('db-update-read-post-by-id', async (_event, post_id: number, is_read: boolean) => {
    const update = db.prepare('UPDATE posts SET is_read = $is_read WHERE id = $post_id');
    return update.run({ post_id: post_id, is_read: is_read ? 1 : 0 });
});

ipcMain.handle('db-read-all-posts', async (_event, feed_id?: number) => {
    const update = db.prepare(`UPDATE posts SET is_read = 1 WHERE ${feed_id ? 'feed_id = ' + feed_id : 'is_read = 0'}`);
    return update.run();
});
