import type { FeedKey } from '@shared/types';
import type { Insertable, Selectable, Updateable } from 'kysely';

import type { FeedDetail, FeedSourceType, Feeds, Folders, GetFeedsFolderGroup, InsertPost, Podcast, PostDetail, Posts } from './database';
import type { SettingsSchema } from './settings';

/** db-get-posts 分页请求参数 */
export interface DbGetPostsParams {
    feedKey: FeedKey;
    onlyUnread: boolean;
    offset?: number;
    limit?: number;
}

/** 侧边栏文章项（含 post.tsx 用到的 feed 字段） */
export type SidebarPost = Pick<Selectable<Posts>, 'id' | 'feedId' | 'title' | 'link' | 'imageUrl' | 'pubDate'> & {
    summary: string;
    isRead: boolean;
    feed: Pick<Selectable<Feeds>, 'icon' | 'link' | 'title'>;
};

export type DbGetPostsResult = {
    title: string;
    posts: SidebarPost[];
    hasMore: boolean;
};

export interface FetchFeedResultPost {
    title?: string;
    link: string;
    author?: string | null;
    imageUrl?: string;
    summary?: string;
    pubDate: string;
    content?: string;
    podcast?: Podcast;
}

/** 订阅源抓取结果，不含 memo（memo 为用户自定义，仅存于数据库） */
export type FetchFeedResult = Omit<Feeds, 'id' | 'memo' | 'lastFetch' | 'lastFetchError' | 'folderId' | 'view' | 'fetchFrequency' | 'type'> & { type: FeedSourceType };
export type FetchFeedPostsResult = Omit<Posts, 'id' | 'feedId' | 'isRead' | 'podcast'> & { content?: string; podcast?: Podcast | null };

export interface IpcEvents {
    'fetch-feed-info': (url: string) => Promise<{ feed: FetchFeedResult; posts?: FetchFeedPostsResult[] }>;
    'cancel-fetch-feed-info': () => void;
    'rss-clear-parse-failures': () => Promise<{ success: boolean; removedFiles: number; message?: string }>;

    'db-get-feeds': (view: number) => Promise<GetFeedsFolderGroup[]>;
    'db-get-feed-by-id': (feedId: number) => Promise<FeedDetail | null>;
    'db-insert-feed': (feed: Insertable<Feeds>) => Promise<number | undefined>;
    'db-update-feed': (feedId: number, feed: Updateable<Feeds>) => Promise<void>;
    'db-delete-feed': (feedId: number) => Promise<void>;

    'db-get-posts': (params: DbGetPostsParams) => Promise<DbGetPostsResult>;
    'db-insert-post': (feedId: number, post: InsertPost) => Promise<void>;
    'db-get-post-by-id': (postId: number) => Promise<PostDetail | null>;
    'db-update-post-read-by-id': (postId: number, isRead: boolean) => Promise<void>;
    'db-read-all-posts': (feedKey?: FeedKey) => Promise<void>;

    'db-get-folders': () => Promise<Selectable<Folders>[]>;
    'db-create-folder': (folderName: string, view?: number) => Promise<number | undefined>;
    'db-update-folder': (folderId: number, folderName: string) => Promise<void>;
    'db-delete-folder': (folderId: number) => Promise<void>;

    'opml-select-file-dialog': () => Promise<string | null>;
    'opml-import-from-content': (content: string) => Promise<PromiseSettledResult<{ success: boolean; message: string }>[]>;
    'opml-export-feeds': () => Promise<{ success: boolean; message?: string; canceled?: boolean }>;

    'settings-get': <T extends keyof SettingsSchema>(key: T) => SettingsSchema[T];
    'settings-update': <T extends keyof SettingsSchema>(key: T, value: SettingsSchema[T]) => void;

    'window-close': () => void;
    'window-maximize': () => void;
    'window-minimize': () => void;
    'get-window-state': () => Promise<boolean>;
}

export type IpcChannel = keyof IpcEvents;
