import type { JSONColumnType } from 'kysely';

export interface Feeds {
    id?: number;
    title: string;
    description?: string;
    link: string;
    url: string;
    lastUpdated?: string;
    icon?: string;
    lastFetch?: string;
    lastFetchError?: string;
    folderId?: number;
    view?: number;
    fetchFrequency?: number;
}

export type Podcast = {
    url: string;
    title?: string;
    duration?: number;
    image?: string;
    title?: string;
    author?: string;
};

export interface Posts {
    id?: number;
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
    postId?: number;
    content?: string;
}

export interface Folders {
    id?: number;
    name: string;
}

export interface Database {
    feeds: Feeds;
    posts: Posts;
    postContents: PostContents;
    folders: Folders;
}
