import dayjs from 'dayjs';
import { ipcMain, net } from 'electron';
import Parser from 'rss-parser';

import { db } from './database';
import type { FeedInfo, PostInfo } from './database';

const parser = new Parser();
ipcMain.handle('get-feed-info', async (_event, feedUrl: string) => {
    const xmlContent = await net.fetch(feedUrl).then(response => response.text());
    const data = await parser.parseString(xmlContent);
    return {
        ...data,
        items: data.items.map(item => {
            const isRss2 = !!item['content:encoded'];
            return {
                title: item.title,
                link: item.link,
                author: (item as any).creator || (item as any).author,
                summary: isRss2 ? item.contentSnippet : item.summary,
                content: isRss2 ? item['content:encoded'] : item.content,
                pubDate: item.pubDate ? dayjs(item.pubDate).format('YYYY-MM-DD HH:mm') : '',
            };
        }),
    };
});

ipcMain.handle('db-get-feeds', async _event => {
    const select = db.prepare('SELECT id, note as title, htmlUrl as link, xmlUrl FROM feeds ORDER BY note ASC');
    return select.all();
});

ipcMain.handle('db-insert-feed', async (_event, feed: FeedInfo) => {
    const insert = db.prepare('INSERT INTO feeds (title, note, description, htmlUrl, xmlUrl, fetch_frequency) VALUES (?, ?, ?, ?, ?, ?)');
    const { lastInsertRowid } = insert.run(feed.title, feed.note ?? feed.title, feed.description ?? '', feed.htmlUrl, feed.xmlUrl, feed.fetchFrequency ?? 60);
    return lastInsertRowid;
});

ipcMain.handle('db-update-feed', async (_event, feed: FeedInfo) => {
    const update = db.prepare('UPDATE feeds SET note = ?, htmlUrl = ?, fetch_frequency = ? WHERE id = ?');
    return update.run(feed.note, feed.htmlUrl, feed.fetchFrequency ?? 60, feed.id);
});

ipcMain.handle('db-delete-feed', async (_event, feedId: number) => {
    const del = db.prepare('DELETE FROM feeds WHERE id = ?');
    return del.run(feedId);
});

ipcMain.handle('db-insert-post', async (_event, post: PostInfo) => {
    const insert = db.prepare('INSERT INTO posts (feed_id, title, link, author, summary, pub_date, content) VALUES (?, ?, ?, ?, ?, ?, ?)');
    return insert.run(post.feedId, post.title, post.link, post.author, post.summary, post.pubDate, post.content);
});

ipcMain.handle('db-get-posts-by-id', async (_event, feedId: number) => {
    const select = db.prepare('SELECT id, title, link, author, summary, pub_date as pubDate, content FROM posts WHERE feed_id = ? ORDER BY pub_date DESC LIMIT 20');
    return select.all(feedId);
});
