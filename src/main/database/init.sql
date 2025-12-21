CREATE TABLE IF NOT EXISTS feeds (
    id INTEGER PRIMARY KEY AUTOINCREMENT, -- 订阅源ID
    title TEXT NOT NULL, -- 订阅源标题
    rawTitle TEXT, -- 订阅源原始标题
    description TEXT, -- 订阅源描述
    htmlUrl TEXT NOT NULL UNIQUE, -- 网址
    xmlUrl TEXT NOT NULL UNIQUE, -- 订阅源网址
    icon TEXT, -- 订阅源图标
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
    summary TEXT NULL, -- 文章简略描述，字数限制在 60 字以内
    pub_date DATETIME NULL, -- 文章发布时间
    created_at DATETIME DEFAULT (DATETIME('now', 'localtime')), -- 创建时间
    updated_at DATETIME DEFAULT (DATETIME('now', 'localtime')), -- 更新时间
    -- 外键关联订阅源，删除订阅源时自动删除文章
    FOREIGN KEY (feed_id) REFERENCES feeds(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS post_contents (
    post_id INTEGER PRIMARY KEY, -- 关联文章ID（一对一）
    summary TEXT NULL, -- 文章摘要
    content TEXT NULL, -- 文章内容
    created_at DATETIME DEFAULT (DATETIME('now', 'localtime')),
    updated_at DATETIME DEFAULT (DATETIME('now', 'localtime')),
    -- 外键关联文章，删除文章时自动删除内容
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

DROP TRIGGER IF EXISTS update_feeds_updated_at;
DROP TRIGGER IF EXISTS update_posts_updated_at;
DROP TRIGGER IF EXISTS update_post_contents_updated_at;

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

CREATE TRIGGER update_post_contents_updated_at
AFTER UPDATE ON post_contents
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE post_contents SET updated_at = (DATETIME('now', 'localtime')) WHERE id = OLD.id;
END;