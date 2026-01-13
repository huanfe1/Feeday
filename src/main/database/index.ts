import { fetchFeed } from '@main/lib/rss';
import { undefined2null } from '@main/lib/utils';
import dayjs from 'dayjs';
import { app } from 'electron';
import schedule from 'node-schedule';
import { DatabaseSync } from 'node:sqlite';
import { join } from 'path';

import type { PostType } from './types';

const dbPath = join(app.getPath('userData'), 'database.db');
export const db = new DatabaseSync(dbPath);

const initSql = `
    CREATE TABLE IF NOT EXISTS feeds (
        id INTEGER PRIMARY KEY AUTOINCREMENT, -- 订阅源ID
        title TEXT NOT NULL, -- 订阅源标题
        description TEXT, -- 订阅源描述
        link TEXT NOT NULL UNIQUE, -- 网址
        url TEXT NOT NULL UNIQUE, -- 订阅源网址
        last_updated DATETIME, -- 订阅源上次更新时间
        icon TEXT, -- 订阅源图标
        last_fetch DATETIME DEFAULT (DATETIME('now', 'localtime')), -- 最后抓取时间
        last_fetch_error TEXT, -- 最后抓取错误信息
        fetch_frequency INTEGER DEFAULT 60, -- 拉取频率（分钟，默认60）
        created_at DATETIME DEFAULT (DATETIME('now', 'localtime')), -- 创建时间
        updated_at DATETIME DEFAULT (DATETIME('now', 'localtime')) -- 更新时间
    );

    CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT, -- 文章ID
        feed_id INTEGER NOT NULL, -- 关联订阅源ID
        title TEXT NOT NULL, -- 文章标题
        link TEXT NOT NULL UNIQUE, -- 文章原文链接（唯一）
        author TEXT NULL, -- 文章作者
        image_url TEXT NULL, -- 文章图片URL
        summary TEXT NULL, -- 文章简略描述
        pub_date DATETIME NULL, -- 文章发布时间
        is_read BOOLEAN DEFAULT 0 CHECK (is_read IN (0, 1)), -- 是否已读
        created_at DATETIME DEFAULT (DATETIME('now', 'localtime')), -- 创建时间
        updated_at DATETIME DEFAULT (DATETIME('now', 'localtime')), -- 更新时间
        -- 外键关联订阅源，删除订阅源时自动删除文章
        FOREIGN KEY (feed_id) REFERENCES feeds(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS post_contents (
        post_id INTEGER PRIMARY KEY, -- 关联文章ID（一对一）
        content TEXT NULL, -- 文章内容
        created_at DATETIME DEFAULT (DATETIME('now', 'localtime')),
        updated_at DATETIME DEFAULT (DATETIME('now', 'localtime')),
        -- 外键关联文章，删除文章时自动删除内容
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
    );

    CREATE TRIGGER IF NOT EXISTS update_feeds_updated_at
    AFTER UPDATE ON feeds
    FOR EACH ROW
    WHEN NEW.updated_at = OLD.updated_at
    BEGIN
        UPDATE feeds SET updated_at = (DATETIME('now', 'localtime')) WHERE id = OLD.id;
    END;

    CREATE TRIGGER IF NOT EXISTS update_posts_updated_at
    AFTER UPDATE ON posts
    FOR EACH ROW
    WHEN NEW.updated_at = OLD.updated_at
    BEGIN
        UPDATE posts SET updated_at = (DATETIME('now', 'localtime')) WHERE id = OLD.id;
    END;

    CREATE TRIGGER IF NOT EXISTS update_post_contents_updated_at
    AFTER UPDATE ON post_contents
    FOR EACH ROW
    WHEN NEW.updated_at = OLD.updated_at
    BEGIN
        UPDATE post_contents SET updated_at = (DATETIME('now', 'localtime')) WHERE id = OLD.id;
    END;
`;

app.whenReady().then(() => {
    db.exec(initSql);
    db.exec('PRAGMA foreign_keys = ON;');

    const every10minTask = schedule.scheduleJob('*/10 * * * *', () => {
        console.log('every 10 minutes task start', new Date().toLocaleString());
        refreshFeed();
    });

    app.on('before-quit', () => {
        db.close();
        every10minTask.cancel();
    });
});

export function insertPost(post: PostType) {
    post = undefined2null(post);
    const insert = db.prepare(
        'INSERT INTO posts (feed_id, title, link, author, image_url, summary, pub_date) VALUES ($feed_id, $title, $link, $author, $image_url, $summary, $pub_date)',
    );
    const insertContent = db.prepare('INSERT INTO post_contents (post_id, content) VALUES ($post_id, $content)');

    try {
        const params = {
            feed_id: post.feed_id,
            title: post.title,
            link: post.link,
            author: post.author,
            image_url: post.image_url ?? null,
            summary: post.summary ?? null,
            pub_date: post.pub_date,
        };

        db.exec('BEGIN TRANSACTION');

        const { lastInsertRowid } = insert.run(params);
        insertContent.run({ post_id: lastInsertRowid, content: post.content ?? null });

        db.exec('COMMIT');
        console.log(`Insert new post ${post.title}, ${post.link}`);
    } catch (error: unknown) {
        db.exec('ROLLBACK');
        if (error instanceof Error && error.message === 'UNIQUE constraint failed: posts.link') return;
        throw error;
    }
}

export async function refreshFeed(timeLimit: boolean = true) {
    const sql = `SELECT id, url, title FROM feeds WHERE ((strftime('%s', datetime('now', 'localtime')) - strftime('%s', last_fetch)) / 60) > ${timeLimit ? 'fetch_frequency' : 5} OR last_fetch = null;`;
    const needFetchFeeds = db.prepare(sql).all();
    if (needFetchFeeds.length === 0) return;

    for (let index = 0; index < needFetchFeeds.length; index += 5) {
        const feeds = needFetchFeeds.slice(index, index + 5);
        const results = await Promise.all(
            feeds.map(async feed => {
                try {
                    console.log(feed.id, feed.title, feed.url);
                    const result = await fetchFeed(feed.url as string);
                    return { success: true, id: feed.id, data: result, feedInfo: feed, message: null };
                } catch (error: unknown) {
                    const message = error instanceof Error ? error.message : String(error);
                    return { success: false, id: feed.id, data: null, feedInfo: feed, message };
                }
            }),
        );
        results.forEach(result => {
            if (result.success) {
                const { data, feedInfo } = result;
                try {
                    db.prepare('UPDATE feeds SET last_fetch = $last_fetch, description = $description, link = $link, icon = $icon WHERE id = $id').run({
                        id: feedInfo.id,
                        description: data?.description || null,
                        link: data?.link || null,
                        icon: data?.icon || null,
                        last_fetch: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                    });
                    data?.items?.forEach(item => insertPost({ feed_id: feedInfo.id, ...item } as PostType));
                } catch (error: unknown) {
                    console.log(error);
                }
            } else {
                const { message, id } = result as { message: string; id: number };
                db.prepare('UPDATE feeds SET last_fetch = $last_fetch, last_fetch_error = $message WHERE id = $id').run({
                    id,
                    message: message || 'Unknown error',
                    last_fetch: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                });
            }
        });
    }
}
