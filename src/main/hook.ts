import dayjs from 'dayjs';
import { ipcMain } from 'electron';
import Parser from 'rss-parser';

import { db } from './database';
import type { FeedInfo, PostInfo } from './database';

const parser = new Parser();
ipcMain.handle('get-feed-info', async (_event, feedUrl: string) => {
    return parser.parseURL(feedUrl).then(data => {
        data.items = data.items.map(item => {
            const isRss2 = !!item['content:encoded'];
            return {
                title: item.title,
                link: item.link,
                author: item.creator || item.author,
                summary: isRss2 ? item.contentSnippet : item.summary,
                content: isRss2 ? item['content:encoded'] : item.content,
                pubDate: item.pubDate ? dayjs(item.pubDate).format('YYYY-MM-DD HH:mm') : '',
            };
        });
        return data;
    });
});

ipcMain.handle('db-insert-feed', async (_event, feed: FeedInfo) => {
    const insert = db.prepare('INSERT INTO feeds (title, note, description, htmlUrl, xmlUrl, fetch_frequency) VALUES (?, ?, ?, ?, ?, ?)');
    const { lastInsertRowid } = insert.run(feed.title, feed.note ?? feed.title, feed.description ?? '', feed.htmlUrl, feed.xmlUrl, feed.fetchFrequency ?? 60);
    return lastInsertRowid;
});

ipcMain.handle('db-insert-post', async (_event, post: PostInfo) => {
    const insert = db.prepare('INSERT INTO posts (feed_id, title, link, author, summary, pub_date, content) VALUES (?, ?, ?, ?, ?, ?, ?)');
    return insert.run(post.feedId, post.title, post.link, post.author, post.summary, post.pubDate, post.content);
});

ipcMain.handle('db-get-feeds', async _event => {
    const select = db.prepare('SELECT id, note as title, htmlUrl as link  FROM feeds');
    return select.all();
});
