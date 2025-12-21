import { app } from 'electron';
import { DatabaseSync } from 'node:sqlite';
import { join } from 'path';

import initSql from './init.sql?raw';

const dbPath = join(app.getPath('userData'), 'database.db');
export const db = new DatabaseSync(dbPath);

db.exec(initSql);

app.on('before-quit', () => {
    db.close();
});

export type FeedInfo = {
    id: number;
    title: string;
    rawTitle: string;
    description: string;
    htmlUrl: string;
    xmlUrl: string;
    icon: string;
    lastFetchTime: string;
    fetchFrequency: number;
    createTime: string;
    updatedAt: string;
};

export type PostInfo = {
    id: number;
    feedId: number;
    title: string;
    link: string;
    author: string;
    summary: string;
    pubDate: string;
    createdAt: string;
    updatedAt: string;
};

export type PostContentInfo = {
    postId: number;
    content: string;
    createdAt: string;
    updatedAt: string;
};
