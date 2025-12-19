CREATE TABLE IF NOT EXISTS feeds (
    id INTEGER PRIMARY KEY AUTOINCREMENT, -- 订阅源ID
    title TEXT NOT NULL, -- 订阅源标题
    note TEXT, -- 订阅源备注
    description TEXT, -- 订阅源描述
    htmlUrl TEXT NOT NULL UNIQUE, -- 网址
    xmlUrl TEXT NOT NULL UNIQUE, -- 订阅源网址
    last_fetch_time DATETIME DEFAULT (DATETIME('now', 'localtime')), -- 最后抓取时间
    fetch_frequency INTEGER DEFAULT 60, -- 拉取频率（分钟，默认60）
    create_time DATETIME DEFAULT (DATETIME('now', 'localtime')), -- 创建时间
    updated_at DATETIME DEFAULT (DATETIME('now', 'localtime')) -- 更新时间
);

CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT, -- 文章ID
    feed_id INTEGER NOT NULL, -- 关联订阅源ID
    title TEXT NOT NULL, -- 文章标题
    link TEXT NOT NULL UNIQUE, -- 文章原文链接（唯一）
    author TEXT NULL, -- 文章作者
    summary TEXT NULL, -- 文章摘要
    pub_date DATETIME NULL, -- 文章发布时间
    content TEXT NULL, -- 文章内容
    created_at DATETIME DEFAULT (DATETIME('now', 'localtime')), -- 创建时间
    updated_at DATETIME DEFAULT (DATETIME('now', 'localtime')), -- 更新时间
    -- 外键关联订阅源，删除订阅源时自动删除文章
    FOREIGN KEY (feed_id) REFERENCES feeds(id) ON DELETE CASCADE
);

DROP TRIGGER IF EXISTS update_feeds_updated_at;
DROP TRIGGER IF EXISTS update_posts_updated_at;

CREATE TRIGGER update_feeds_updated_at
AFTER UPDATE ON feeds
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE feeds SET updated_at = (DATETIME('now', 'localtime')) WHERE id = OLD.id;
END;

CREATE TRIGGER update_posts_updated_at
AFTER UPDATE ON posts
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE posts SET updated_at = (DATETIME('now', 'localtime')) WHERE id = OLD.id;
END;