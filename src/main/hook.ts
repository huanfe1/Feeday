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
    const select = db.prepare('SELECT id, title, link, url, icon FROM feeds ORDER BY title ASC');
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

ipcMain.handle('db-get-posts', async _event => {
    const select = db.prepare(
        'SELECT p.id, p.title, p.link, p.summary, COALESCE(p.author, f.title) as author, p.pub_date FROM posts p LEFT JOIN feeds f ON f.id = p.feed_id ORDER BY p.pub_date DESC LIMIT 30',
    );
    return select.all();
});

ipcMain.handle('db-get-posts-by-id', async (_event, feedId: number) => {
    const select = db.prepare(
        'SELECT p.id, p.title, p.link, p.summary, COALESCE(p.author, f.title) as author, p.pub_date FROM posts p LEFT JOIN feeds f ON f.id = p.feed_id WHERE p.feed_id = ? ORDER BY p.pub_date DESC LIMIT 30',
    );
    return select.all(feedId);
});

ipcMain.handle('db-get-post-content-by-id', async (_event, postId: number) => {
    const select = db.prepare('SELECT p.summary, pc.content FROM posts As p LEFT JOIN post_contents As pc ON p.id = pc.post_id WHERE p.id = ?');
    return select.get(postId);
});
