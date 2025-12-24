import dayjs from 'dayjs';
import { ipcMain, net } from 'electron';
import { parseFeed } from 'feedsmith';

import { db } from './database';
import rssParser from './lib/rssParser';

ipcMain.handle('get-feed-info', async (_event, feedUrl: string) => {
    return new Promise(async (resolve, reject) => {
        net.fetch(feedUrl)
            .then(response => response.text())
            .then(content => {
                const result = rssParser(content);
                if (result) resolve(result);
                const { format, feed } = parseFeed(content);
                resolve({ format, feed });
            })
            .catch(error => reject(error));
    });
});

ipcMain.handle('db-get-feeds', async _event => {
    const select = db.prepare('SELECT id, title, link, url, icon FROM feeds ORDER BY title ASC');
    return select.all();
});

ipcMain.handle('db-insert-feed', async (_event, feed) => {
    const insert = db.prepare('INSERT INTO feeds (title, description, link, url, last_updated, icon) VALUES (?, ?, ?, ?, ?, ?)');
    const { lastInsertRowid } = insert.run(...formatArgs(feed.title, feed.description, feed.link, feed.url, feed.last_updated, feed.icon));
    return lastInsertRowid;
});

ipcMain.handle('db-update-feed', async (_event, feed) => {
    const update = db.prepare('UPDATE feeds SET title = ?, link = ?, fetch_frequency = ? WHERE id = ?');
    return update.run(...formatArgs(feed.title, feed.link, feed.fetchFrequency ?? 60, feed.id));
});

ipcMain.handle('db-delete-feed', async (_event, feedId: number) => {
    const del = db.prepare('DELETE FROM feeds WHERE id = ?');
    return del.run(feedId);
});

ipcMain.handle('db-insert-post', async (_event, post) => {
    return new Promise(async (resolve, reject) => {
        try {
            const insert = db.prepare('INSERT INTO posts (feed_id, title, link, author, image_url, summary, pub_date) VALUES (?, ?, ?, ?, ?, ?, ?)');
            const { lastInsertRowid } = insert.run(
                ...formatArgs(post.feedId, post.title, post.link, post.author, post.image_url, post.summary, dayjs(post.pubDate).format('YYYY-MM-DD HH:mm:ss')),
            );
            const insertContent = db.prepare('INSERT INTO post_contents (post_id, content) VALUES (?, ?)');
            insertContent.run(...formatArgs(lastInsertRowid, post.content));
            resolve(lastInsertRowid);
        } catch (error: any) {
            if (error.errstr !== 'constraint failed') {
                reject(error);
            }
        }
    });
});

ipcMain.handle('db-get-posts', async _event => {
    const select = db.prepare(
        `SELECT p.id,
                p.title,
                p.link,
                f.title AS author,
                p.summary,
                p.pub_date as pubDate
         FROM posts p
         LEFT JOIN feeds f ON f.id = p.feed_id
         ORDER BY p.pub_date DESC
         LIMIT 30`,
    );
    return select.all();
});

ipcMain.handle('db-get-posts-by-id', async (_event, feedId: number) => {
    const select = db.prepare(
        `SELECT p.id,
                p.title,
                p.link,
                f.title AS author,
                p.summary,
                p.pub_date as pubDate
         FROM posts p
         LEFT JOIN feeds f ON f.id = p.feed_id
         WHERE p.feed_id = ?
         ORDER BY p.pub_date DESC
         LIMIT 20`,
    );
    return select.all(feedId);
});

ipcMain.handle('db-get-post-content-by-id', async (_event, postId: number) => {
    const select = db.prepare('SELECT p.summary, pc.content FROM posts As p LEFT JOIN post_contents As pc ON p.id = pc.post_id WHERE p.id = ?');
    return select.get(postId);
});

function formatArgs(...args: any[]) {
    return args.map(arg => arg ?? null);
}
