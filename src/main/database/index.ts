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
    note: string;
    description: string;
    htmlUrl: string;
    xmlUrl: string;
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
    content: string;
    createdAt: string;
    updatedAt: string;
};
