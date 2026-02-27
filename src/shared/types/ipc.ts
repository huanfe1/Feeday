import type { Insertable, Selectable, Updateable } from 'kysely';

import type { Feeds, Folders, GetFeedsResult, InsertPost, Podcast, Posts } from './database';
import type { SettingsSchema } from './settings';

interface GetPostsParams {
    onlyUnread: boolean;
    feedId?: number;
    folderId?: number;
    view: number;
}

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

export type FetchFeedResult = Omit<Feeds, 'id' | 'lastFetch' | 'lastFetchError' | 'folderId' | 'view' | 'fetchFrequency'>;
export type FetchFeedPostsResult = Omit<Posts, 'id' | 'feedId' | 'isRead'> & { content?: string };

export interface IpcEvents {
    'fetch-feed-info': (url: string) => Promise<{ feed: FetchFeedResult; posts?: FetchFeedPostsResult[] }>;

    'db-get-feeds': () => Promise<GetFeedsResult[]>;
    'db-insert-feed': (feed: Insertable<Feeds>) => Promise<number | undefined>;
    'db-update-feed': (feedId: number, feed: Updateable<Feeds>) => Promise<void>;
    'db-delete-feed': (feedId: number) => Promise<void>;

    'db-get-posts': (params: GetPostsParams) => Promise<Selectable<Posts>[]>;
    'db-insert-post': (feedId: number, post: InsertPost) => Promise<void>;
    'db-get-post-content-by-id': (postId: number) => Promise<string>;
    'db-update-post-read-by-id': (postId: number, isRead: boolean) => Promise<void>;
    'db-read-all-posts': (feedId?: number, folderId?: number) => Promise<void>;

    'db-get-folders': () => Promise<Selectable<Folders>[]>;
    'db-insert-folder': (folderName: string) => Promise<number | undefined>;
    'db-update-folder': (folderId: number, folderName: string) => Promise<void>;
    'db-delete-folder': (folderId: number) => Promise<void>;

    'opml-select-file-dialog': () => Promise<string | null>;
    'opml-import-from-content': (content: string) => Promise<PromiseSettledResult<{ success: boolean; message: string }>[]>;

    'settings-get': <T extends keyof SettingsSchema>(key: T) => SettingsSchema[T];
    'settings-update': <T extends keyof SettingsSchema>(key: T, value: SettingsSchema[T]) => void;

    'window-close': () => void;
    'window-maximize': () => void;
    'window-minimize': () => void;
    'get-window-state': () => Promise<boolean>;
}

export type IpcChannel = keyof IpcEvents;
