import { fetchFeed } from '@main/lib/rss';
import { undefined2null } from '@main/lib/utils';
import dayjs from 'dayjs';
import { app } from 'electron';
import { EventEmitter } from 'events';
import { DatabaseSync } from 'node:sqlite';
import { join } from 'path';

import type { FeedType, PostType } from './types';

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
        folder_id INTEGER NULL, -- 文件夹ID
        fetch_frequency INTEGER DEFAULT 60, -- 拉取频率（分钟，默认60）
        created_at DATETIME DEFAULT (DATETIME('now', 'localtime')), -- 创建时间
        updated_at DATETIME DEFAULT (DATETIME('now', 'localtime')), -- 更新时间

        FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL -- 外键关联文件夹，删除文件夹时自动将包含订阅源设置为空
    );

    CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT, -- 文章ID
        feed_id INTEGER NOT NULL, -- 关联订阅源ID
        title TEXT NOT NULL, -- 文章标题
        link TEXT NOT NULL UNIQUE, -- 文章原文链接（唯一）
        author TEXT NULL, -- 文章作者
        image_url TEXT NULL, -- 文章图片URL
        summary TEXT NULL, -- 文章简略描述
        podcast TEXT NULL, -- 文章播客信息，JSON格式
        pub_date DATETIME NULL, -- 文章发布时间
        is_read BOOLEAN DEFAULT 0 CHECK (is_read IN (0, 1)), -- 是否已读
        created_at DATETIME DEFAULT (DATETIME('now', 'localtime')), -- 创建时间
        updated_at DATETIME DEFAULT (DATETIME('now', 'localtime')), -- 更新时间
        
        FOREIGN KEY (feed_id) REFERENCES feeds(id) ON DELETE CASCADE -- 外键关联订阅源，删除订阅源时自动删除文章
    );

    CREATE TABLE IF NOT EXISTS post_contents (
        post_id INTEGER PRIMARY KEY, -- 关联文章ID（一对一）
        content TEXT NULL, -- 文章内容
        created_at DATETIME DEFAULT (DATETIME('now', 'localtime')),
        updated_at DATETIME DEFAULT (DATETIME('now', 'localtime')),

        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE -- 外键关联文章，删除文章时自动删除内容
    );

    CREATE TABLE IF NOT EXISTS folders (
        id INTEGER PRIMARY KEY AUTOINCREMENT, -- 文件夹ID
        name TEXT NOT NULL UNIQUE, -- 文件夹名称
        created_at DATETIME DEFAULT (DATETIME('now', 'localtime')), -- 创建时间
        updated_at DATETIME DEFAULT (DATETIME('now', 'localtime')) -- 更新时间
    );

    CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT, -- 设置ID
        key TEXT NOT NULL UNIQUE, -- 设置键
        value TEXT, -- 设置值
        created_at DATETIME DEFAULT (DATETIME('now', 'localtime')), -- 创建时间
        updated_at DATETIME DEFAULT (DATETIME('now', 'localtime')) -- 更新时间
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

    CREATE TRIGGER IF NOT EXISTS update_folders_updated_at
    AFTER UPDATE ON folders
    FOR EACH ROW
    WHEN NEW.updated_at = OLD.updated_at
    BEGIN
        UPDATE folders SET updated_at = (DATETIME('now', 'localtime')) WHERE id = OLD.id;
    END;

    CREATE TRIGGER IF NOT EXISTS update_settings_updated_at
    AFTER UPDATE ON settings
    FOR EACH ROW
    WHEN NEW.updated_at = OLD.updated_at
    BEGIN
        UPDATE settings SET updated_at = (DATETIME('now', 'localtime')) WHERE id = OLD.id;
    END;
`;

const initSettings = `
    INSERT OR IGNORE INTO settings (key, value) VALUES
    ('window_width', '1280'),
    ('window_height', '720'),
    ('is_maximized', false),
    ('rsshub_source', 'https://rsshub.app'),
    ('avatar_proxy', 'https://unavatar.webp.se');
`;

try {
    db.exec(initSql);
    db.exec(initSettings);
    db.exec('PRAGMA foreign_keys = ON;');
} catch (error: unknown) {
    console.error(error);
}
app.on('before-quit', () => db.close());

export function insertPost(feed_id: number, post: PostType) {
    post = undefined2null(post);
    const insert = db.prepare(
        'INSERT INTO posts (feed_id, title, link, author, image_url, summary, podcast, pub_date) VALUES ($feed_id, $title, $link, $author, $image_url, $summary, $podcast, $pub_date)',
    );
    const insertContent = db.prepare('INSERT INTO post_contents (post_id, content) VALUES ($post_id, $content)');

    try {
        const params = {
            feed_id,
            title: post.title,
            link: post.link,
            author: post.author,
            image_url: post.image_url ?? null,
            summary: post.summary ?? null,
            podcast: post.podcast ? JSON.stringify(post.podcast) : null,
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

const emitter = new EventEmitter();

emitter.on('updateFeed', (feed_id: number, feed: FeedType, posts: PostType[]) => {
    console.log('updateFeed', feed_id, feed.title);
    db.prepare('UPDATE feeds SET last_fetch = $last_fetch, description = $description, link = $link, icon = $icon, last_fetch_error = null WHERE id = $id').run({
        id: feed_id,
        description: feed.description || null,
        link: feed.link || null,
        icon: feed.icon || null,
        last_fetch: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    });
    posts.forEach(post => insertPost(feed_id, post));
});

emitter.on('errorFeed', (feed_id: number, message: string) => {
    db.prepare('UPDATE feeds SET last_fetch = $last_fetch, last_fetch_error = $message WHERE id = $id').run({
        id: feed_id,
        message: message || 'Unknown error',
        last_fetch: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    });
});

export async function refreshFeed(timeLimit: boolean = true) {
    const sql = `SELECT id, url, title FROM feeds WHERE ((strftime('%s', datetime('now', 'localtime')) - strftime('%s', last_fetch)) / 60) > ${timeLimit ? 'fetch_frequency' : 5} OR last_fetch = null;`;
    const needFetchFeeds = db.prepare(sql).all();

    console.log(`Need fetch feeds: ${needFetchFeeds.length}`);

    if (needFetchFeeds.length === 0) return;

    const maxParallel = 5;
    let index = 0;

    async function fetchNext() {
        if (index >= needFetchFeeds.length) return null;
        const feed = needFetchFeeds[index];
        index += 1;

        try {
            const result = await fetchFeed(feed.url as string);
            emitter.emit('updateFeed', feed.id, result, result.items);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            emitter.emit('errorFeed', feed.id, message);
        }

        return fetchNext();
    }

    for (let i = 0; i < maxParallel; i += 1) {
        fetchNext();
    }
}
