import type { Generated, Insertable, JSONColumnType, Selectable, Updateable } from 'kysely';

export type { Insertable, Selectable, Updateable } from 'kysely';

export interface Feeds {
    id: Generated<number>;
    title: string;
    description?: string;
    link: string;
    url: string;
    lastUpdated?: string;
    icon?: string;
    lastFetch: Generated<string>;
    lastFetchError?: string;
    folderId?: number;
    view: Generated<number>;
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
    author?: string;
    imageUrl?: string;
    summary?: string;
    podcast?: JSONColumnType<Podcast>;
    pubDate: string;
    isRead?: 0 | 1;
}

export interface PostContents {
    postId: number;
    content?: string;
}

export type InsertPost = Omit<Insertable<Posts>, 'podcast' | 'feedId'> & Omit<PostContents, 'postId'> & { podcast?: Podcast };

/** db-get-feeds 查询结果：Selectable<Feeds> 子集 + hasUnread */
export type GetFeedsResult = Pick<
    Selectable<Feeds>,
    'id' | 'title' | 'link' | 'url' | 'view' | 'fetchFrequency' | 'folderId' | 'lastFetchError' | 'icon'
> & { hasUnread: boolean };

/** 前端 store 中的 post：Selectable<Posts> + isRead 转为 boolean + summary 必填 */
export type PostWithNormalized = Omit<Selectable<Posts>, 'isRead' | 'summary'> & { isRead: boolean; summary: string };

export interface Folders {
    id: Generated<number>;
    name: string;
}

export interface Database {
    feeds: Feeds;
    posts: Posts;
    postContents: PostContents;
    folders: Folders;
}
