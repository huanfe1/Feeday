import { app, ipcMain } from 'electron';
import { DatabaseSync } from 'node:sqlite';
import { join } from 'path';

import initSql from './init.sql?raw';

const dbPath = join(app.getPath('userData'), 'database.db');
export const db = new DatabaseSync(dbPath);

db.exec(initSql);

app.on('before-quit', () => {
    db.close();
});

export type FeedInfo = {
    id: number;
    title: string;
    note: string;
    htmlUrl: string;
    xmlUrl: string;
    lastFetchTime: string;
    fetchFrequency: number;
    createTime: string;
    updatedAt: string;
};

export type PostInfo = {
    id: number;
    feedId: number;
    title: string;
    link: string;
    author: string;
    summary: string;
    pubDate: string;
    content: string;
    contentEncoded: string;
    createdAt: string;
    updatedAt: string;
};

// type Feed = { title: string; note?: string; htmlUrl: string; xmlUrl: string; fetch_frequency?: number };
// export const insertFeed = (feed: Feed) => {
//     const insert = db.prepare('INSERT INTO feeds (title, note, htmlUrl, xmlUrl, fetch_frequency) VALUES (?, ?, ?, ?, ?)');
//     return insert.run(feed.title, feed.note ?? feed.title, feed.htmlUrl, feed.xmlUrl, feed.fetch_frequency ?? 60);
// };

// ipcMain.handle('db-insert-feed', (_event, feed: Feed) => {
//     return insertFeed(feed);
// });

// ipcMain.handle('db-get-feeds', () => {
//     return db.prepare('SELECT * FROM feeds').all();
// });

// type Post = { feed_id: number; title: string; link: string; author: string; summary: string; pub_date: string; content: string; content_encoded: string };
// ipcMain.handle('db-insert-post', (_event, post: Post) => {
//     const insert = db.prepare('INSERT INTO posts (feed_id, title, link, author, summary, pub_date, content, content_encoded) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
//     return insert.run(post.feed_id, post.title, post.link, post.author, post.summary, post.pub_date, post.content, post.content_encoded);
// });

// export default function () {}
