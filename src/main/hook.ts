import dayjs from 'dayjs';
import { ipcMain, net } from 'electron';
import { parseFeed } from 'feedsmith';

import { db } from './database';
import type { FeedInfo, PostContentInfo, PostInfo } from './database';
import { truncate } from './lib/utils';

ipcMain.handle('get-feed-info', async (_event, feedUrl: string): Promise<Partial<FeedInfo & { items: Partial<PostInfo>[] }> | null> => {
    const xmlContent = await net.fetch(feedUrl).then(response => response.text());
    const { format, feed } = parseFeed(xmlContent);

    if (format === 'atom') {
        return {
            rawTitle: feed.title ?? '',
            description: feed.subtitle ?? '',
            icon: feed.icon ?? '',
            htmlUrl: feed.id ?? '',
            xmlUrl: feedUrl,
            items: feed.entries?.map(item => ({
                title: item.title,
                link: item.id,
                summary: item.summary,
                content: item.content,
                pubDate: item.updated ?? item.published ?? '',
            })),
            // data: { feed, format },
        };
    } else if (format === 'rss') {
        return {
            rawTitle: feed.title ?? '',
            description: feed.description ?? '',
            icon: feed.image?.url ?? '',
            htmlUrl: feed.link ?? '',
            xmlUrl: feedUrl,
            items: feed.items?.map(item => ({
                title: item.title,
                link: item.link,
                summary: item.description,
                content: item.content?.encoded,
                pubDate: item.pubDate,
                author: item.authors?.join(','),
            })),
            // data: { feed, format },
        };
    }
    return null;
    // return {
    //     ...data,
    //     items: data.items.map(item => {
    //         const isRss2 = !!item['content:encoded'];
    //         return {
    //             title: item.title,
    //             link: item.link,
    //             author: (item as any).creator || (item as any).author,
    //             summary: isRss2 ? item.contentSnippet : item.summary,
    //             content: isRss2 ? item['content:encoded'] : item.content,
    //             pubDate: item.pubDate ? dayjs(item.pubDate).format('YYYY-MM-DD HH:mm') : '',
    //         };
    //     }),
    // };
});

ipcMain.handle('db-get-feeds', async _event => {
    const select = db.prepare('SELECT id, title, htmlUrl, xmlUrl, icon FROM feeds ORDER BY title ASC');
    return select.all();
});

ipcMain.handle('db-insert-feed', async (_event, feed: FeedInfo) => {
    const insert = db.prepare('INSERT INTO feeds (title, rawTitle, description, htmlUrl, xmlUrl, icon) VALUES (?, ?, ?, ?, ?, ?)');
    const { lastInsertRowid } = insert.run(feed.title, feed.rawTitle, feed.description ?? '', feed.htmlUrl, feed.xmlUrl, feed.icon || '');
    return lastInsertRowid;
});

ipcMain.handle('db-update-feed', async (_event, feed: FeedInfo) => {
    const update = db.prepare('UPDATE feeds SET title = ?, htmlUrl = ?, fetch_frequency = ? WHERE id = ?');
    return update.run(feed.title, feed.htmlUrl, feed.fetchFrequency ?? 60, feed.id);
});

ipcMain.handle('db-delete-feed', async (_event, feedId: number) => {
    const del = db.prepare('DELETE FROM feeds WHERE id = ?');
    return del.run(feedId);
});

ipcMain.handle('db-insert-post', async (_event, post: PostInfo & PostContentInfo) => {
    const insert = db.prepare('INSERT INTO posts (feed_id, title, link, author, summary, pub_date) VALUES (?, ?, ?, ?, ?, ?)');
    const { lastInsertRowid } = insert.run(
        post.feedId,
        post.title ?? '',
        post.link ?? '',
        post.author ?? null,
        truncate(post.summary) || truncate(post.content) || '',
        dayjs(post.pubDate).format('YYYY-MM-DD HH:mm:ss') ?? null,
    );
    const insertContent = db.prepare('INSERT INTO post_contents (post_id, summary, content) VALUES (?, ?, ?)');
    return insertContent.run(lastInsertRowid, post.summary || '', post.content ?? '');
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
    const select = db.prepare('SELECT summary, content FROM post_contents WHERE post_id = ?');
    return select.get(postId);
});
