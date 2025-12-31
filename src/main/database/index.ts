import { fetchFeed } from '@main/lib/rss';
import { undefined2null } from '@main/lib/utils';
import dayjs from 'dayjs';
import { app } from 'electron';
import schedule from 'node-schedule';
import { DatabaseSync } from 'node:sqlite';
import { join } from 'path';

import initSql from './init.sql?raw';

const dbPath = join(app.getPath('userData'), 'database.db');
export const db = new DatabaseSync(dbPath);

export function insertPost(post) {
    post = undefined2null(post);
    const insert = db.prepare(
        'INSERT OR IGNORE INTO posts (feed_id, title, link, author, image_url, summary, pub_date) VALUES ($feed_id, $title, $link, $author, $image_url, $summary, $pub_date)',
    );
    const insertContent = db.prepare('INSERT OR IGNORE INTO post_contents (post_id, content) VALUES ($post_id, $content)');

    const { lastInsertRowid } = insert.run({
        feed_id: post.feed_id,
        title: post.title,
        link: post.link,
        author: post.author,
        image_url: post.image_url,
        summary: post.summary,
        pub_date: post.pub_date,
    });

    // 只有当成功插入新行时才插入内容
    if (lastInsertRowid > 0) {
        console.log(`insert new post ${post.title} ${post.link}`);
        insertContent.run({ post_id: lastInsertRowid, content: post.content });
    }

    return lastInsertRowid;
}

async function refreshFeed(timeLimit: boolean = true) {
    const sql = `SELECT id, url, title FROM feeds WHERE ((strftime('%s', datetime('now', 'localtime')) - strftime('%s', last_fetch)) / 60) > ${timeLimit ? 'fetch_frequency' : 5} OR last_fetch = null;`;
    const needFetchFeeds = db.prepare(sql).all();
    if (needFetchFeeds.length === 0) return;

    for (const feed of needFetchFeeds) {
        try {
            const feedInfo: any = await fetchFeed(feed.url as string);
            // console.log(feed.id, feed.title, feedInfo?.items?.length);

            // 使用事务批量插入文章
            db.exec('BEGIN TRANSACTION');
            try {
                db.prepare('UPDATE feeds SET last_fetch = $last_fetch, description = $description, link = $link, icon = $icon WHERE id = $id').run({
                    id: feed.id,
                    description: feedInfo?.description || null,
                    link: feedInfo?.link || null,
                    icon: feedInfo?.icon || null,
                    last_fetch: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                });

                feedInfo?.items?.forEach(item => {
                    insertPost({ feed_id: feed.id, ...item });
                });

                db.exec('COMMIT');
            } catch (error: any) {
                db.exec('ROLLBACK');
                throw error;
            }
        } catch (error: any) {
            console.error(`Failed to refresh feed ${feed.id}, ${feed.title} (${feed.url}):`, error.message);
        }
    }
}

app.whenReady().then(() => {
    db.exec(initSql);
    // 启用外键约束（必须在创建表之后）
    db.exec('PRAGMA foreign_keys = ON;');

    const every10minTask = schedule.scheduleJob('*/10 * * * *', () => {
        console.log('every 10 minutes task start', new Date().toLocaleString());
        refreshFeed();
    });
    refreshFeed(false);

    app.on('before-quit', () => {
        db.close();
        every10minTask.cancel();
    });
});
