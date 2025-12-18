import { ipcMain } from 'electron';
import Parser from 'rss-parser';

import { db } from './database';
import type { FeedInfo, PostInfo } from './database';

const parser = new Parser();
ipcMain.handle('get-feed-info', async (_event, feedUrl: string) => {
    return parser.parseURL(feedUrl);
});

ipcMain.handle('db-insert-feed', async (_event, feed: FeedInfo) => {
    const insert = db.prepare('INSERT INTO feeds (title, note, htmlUrl, xmlUrl, fetch_frequency) VALUES (?, ?, ?, ?, ?, ?)');
    const data = insert.run(feed.title, feed.note ?? feed.title, feed.htmlUrl, feed.xmlUrl, feed.fetchFrequency ?? 60);
    console.log(data);
});

ipcMain.handle('db-insert-post', async (_event, post: PostInfo) => {
    const insert = db.prepare('INSERT INTO posts (feed_id, title, link, author, summary, pub_date, content, content_encoded) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    return insert.run(post.feedId, post.title, post.link, post.author, post.summary, post.pubDate, post.content, post.contentEncoded);
});
