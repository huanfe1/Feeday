import type { ColumnType, Generated, Insertable, JSONColumnType, Selectable } from 'kysely';

/** 订阅源类型：0 默认链接，1 RSSHub */
export type FeedSourceType = 0 | 1;

export interface Feeds {
    id: Generated<number>;
    title: string;
    memo: string | null;
    description: string | null;
    link: string;
    url: string;
    lastUpdated: string | null;
    icon: string | null;
    lastFetch: Generated<string>;
    lastFetchError: string | null;
    folderId: number | null;
    view: Generated<number>;
    type: Generated<FeedSourceType>;
    fetchFrequency: Generated<number>;
}

export interface Podcast {
    url: string;
    duration?: number;
    image?: string;
    title?: string;
    author?: string;
}

export interface Posts {
    id: Generated<number>;
    feedId: number;
    title: string;
    link: string;
    author: string | null;
    imageUrl: string | null;
    summary: string | null;
    podcast: JSONColumnType<Podcast> | null; // 存储 JSON 字符串
    pubDate: string | null;
    isRead: ColumnType<boolean, 0 | 1 | boolean | undefined, 0 | 1 | boolean>;
}

export interface PostContents {
    postId: number; // 注意：这里是一对一的主键，通常不是 Generated
    content: string | null;
}

export type InsertPost = Omit<Insertable<Posts>, 'podcast' | 'feedId'> & Partial<Omit<PostContents, 'postId'>> & { podcast?: Podcast | null };

/** db-get-feeds 查询结果：Selectable<Feeds> 子集 + hasUnread */
export type GetFeedsResult = Pick<Selectable<Feeds>, 'id' | 'title' | 'memo' | 'link' | 'url' | 'type' | 'view' | 'folderId' | 'lastFetchError' | 'icon'> & {
    hasUnread: boolean;
};

/** db-get-feeds：按文件夹分组的列表（id=0 为未分类） */
export type GetFeedsFolderGroup = {
    id: number;
    title: string;
    view: number;
    feeds: GetFeedsResult[];
};

/** db-get-feed-by-id 查询结果：单条订阅源完整字段 */
export type FeedDetail = Selectable<Feeds>;

/** 前端 store 中的 post：Selectable<Posts> + isRead 转为 boolean + summary 必填 */
export type PostWithNormalized = Omit<Selectable<Posts>, 'isRead' | 'summary'> & { isRead: boolean; summary: string };

export type PostDetail = Omit<PostWithNormalized, 'summary'> & {
    content: string;
    feedTitle: string;
    feedIcon: string | null;
    feedLink: string;
};

export interface Folders {
    id: Generated<number>;
    name: string;
    view: Generated<number>;
}

export interface Database {
    feeds: Feeds;
    posts: Posts;
    postContents: PostContents;
    folders: Folders;
}
