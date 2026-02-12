import type { DatabaseSync } from 'node:sqlite';

const initSql = `
    CREATE TABLE IF NOT EXISTS feeds (
        id INTEGER PRIMARY KEY AUTOINCREMENT, -- 订阅源ID
        title TEXT NOT NULL, -- 订阅源标题
        description TEXT, -- 订阅源描述
        link TEXT NOT NULL UNIQUE, -- 网址
        url TEXT NOT NULL UNIQUE, -- 订阅源网址
        last_updated DATETIME NULL, -- 订阅源上次更新时间
        icon TEXT NULL, -- 订阅源图标
        last_fetch DATETIME NOT NULL DEFAULT (DATETIME('now', 'localtime')), -- 最后抓取时间
        last_fetch_error TEXT NULL, -- 最后抓取错误信息
        folder_id INTEGER NULL, -- 文件夹ID
        view INTEGER NOT NULL DEFAULT 1, -- 视图（1: 文章, 2: 媒体）
        fetch_frequency INTEGER NOT NULL DEFAULT 60, -- 拉取频率（分钟，默认60）
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
        UPDATE post_contents SET updated_at = (DATETIME('now', 'localtime')) WHERE post_id = OLD.post_id;
    END;

    CREATE TRIGGER IF NOT EXISTS update_folders_updated_at
    AFTER UPDATE ON folders
    FOR EACH ROW
    WHEN NEW.updated_at = OLD.updated_at
    BEGIN
        UPDATE folders SET updated_at = (DATETIME('now', 'localtime')) WHERE id = OLD.id;
    END;

    PRAGMA foreign_keys = ON;
`;

export function initDB(db: DatabaseSync) {
    db.exec(initSql);
}
