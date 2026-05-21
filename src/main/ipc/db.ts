import { db, dbMethods } from '@/database';
import type { FeedKeyPrefix } from '@shared/types';
import type { GetFeedsFolderGroup } from '@shared/types/database';
import { sql } from 'kysely';

import { ipcMain } from '@/lib/utils';

// Feeds

ipcMain.handle('db-get-feeds', async (_event, view: number) => {
    const folderRows = await db.selectFrom('folders').select(['id', 'name']).where('view', '=', view).orderBy('name', 'asc').execute();

    const folderIds = [...folderRows, { id: 0, name: '未分类' }];

    return Promise.all(
        folderIds.map(async f => {
            const rows = await db
                .selectFrom('feeds')
                .leftJoin('posts', join => join.onRef('posts.feedId', '=', 'feeds.id').on('posts.isRead', '=', 0 as never))
                .select(sql<boolean>`CASE WHEN COUNT(posts.id) > 0 THEN 1 ELSE 0 END`.as('hasUnread'))
                .select(['feeds.id', 'feeds.title', 'feeds.memo', 'feeds.link', 'feeds.url', 'feeds.type', 'feeds.view', 'feeds.folderId', 'feeds.lastFetchError', 'feeds.icon'])
                .$if(f.id !== 0, qb => qb.where('feeds.folderId', '=', f.id).where('feeds.view', '=', view))
                .$if(f.id === 0, qb => qb.where('feeds.folderId', 'is', null).where('feeds.view', '=', view))
                .groupBy('feeds.id')
                .orderBy('feeds.title', 'asc')
                .execute();

            const feeds = rows.map(row => ({ ...row, title: row.memo ?? row.title, hasUnread: !!row.hasUnread }));

            return { id: f.id, title: f.name, view, feeds } satisfies GetFeedsFolderGroup;
        }),
    );
});

ipcMain.handle('db-get-feed-by-id', async (_event, feedId: number) => {
    if (feedId == null) return null;
    const row = await db.selectFrom('feeds').selectAll().where('id', '=', feedId).executeTakeFirst();
    return row ?? null;
});

ipcMain.handle('db-insert-feed', async (_event, feed) => {
    return dbMethods.insertFeed(feed);
});

ipcMain.handle('db-update-feed', async (_event, feedId, feed) => {
    return dbMethods.updateFeed(feedId, feed);
});

ipcMain.handle('db-delete-feed', async (_event, feedId) => {
    await db.deleteFrom('feeds').where('id', '=', feedId).execute();
});

// Posts

ipcMain.handle('db-get-posts', async (_event, { feedKey, onlyUnread, offset = 0, limit = 50 }) => {
    const [prefix, idStr] = feedKey.split('-') as [FeedKeyPrefix, string];
    const id = Number(idStr);

    if (!Number.isFinite(id)) {
        return { title: '', posts: [], hasMore: false };
    }

    const titleP =
        offset === 0 && prefix === 'feed'
            ? db
                  .selectFrom('feeds')
                  .select(['title', 'memo'])
                  .where('id', '=', id)
                  .executeTakeFirst()
                  .then(row => row?.memo ?? row?.title ?? '')
            : offset === 0 && prefix === 'folder'
              ? db
                    .selectFrom('folders')
                    .select('name')
                    .where('id', '=', id)
                    .executeTakeFirst()
                    .then(row => row?.name ?? '')
              : Promise.resolve('');

    const fetchLimit = limit + 1;
    const rowsP = db
        .selectFrom('posts')
        .innerJoin('feeds', 'posts.feedId', 'feeds.id')
        .select([
            'posts.id',
            'posts.feedId',
            'posts.title',
            'posts.link',
            'posts.summary',
            'posts.imageUrl',
            'posts.pubDate',
            'posts.isRead',
            'feeds.icon as feedIcon',
            'feeds.link as feedLink',
            sql<string>`COALESCE(feeds.memo, feeds.title)`.as('feedTitle'),
        ])
        .$if(onlyUnread, qb => qb.where('posts.isRead', '=', 0 as never))
        .$if(prefix === 'feed', qb => qb.where('posts.feedId', '=', id))
        .$if(prefix === 'folder', qb => qb.where('feeds.folderId', '=', id))
        .$if(prefix === 'view', qb => qb.where('feeds.view', '=', id))
        .$if(!onlyUnread, qb => qb.orderBy('posts.isRead', 'asc'))
        .orderBy('posts.pubDate', 'desc')
        .orderBy('posts.id', 'desc')
        .limit(fetchLimit)
        .offset(offset)
        .execute();

    const [title, rows] = await Promise.all([titleP, rowsP]);
    const hasMore = rows.length > limit;

    return {
        title,
        posts: rows.slice(0, limit).map(r => ({
            id: r.id,
            feedId: r.feedId,
            title: r.title,
            link: r.link,
            summary: r.summary ?? '',
            imageUrl: r.imageUrl,
            pubDate: r.pubDate,
            isRead: !!r.isRead,
            feed: { icon: r.feedIcon, link: r.feedLink, title: r.feedTitle },
        })),
        hasMore,
    };
});

ipcMain.handle('db-insert-post', async (_event, feed_id, post) => {
    return dbMethods.insertPost(feed_id, post);
});

ipcMain.handle('db-get-post-by-id', async (_event, postId) => {
    if (postId == null) return null;

    const row = await db
        .selectFrom('posts')
        .select(['posts.id', 'posts.title', 'posts.link', 'posts.summary', 'posts.feedId', 'posts.author', 'posts.pubDate', 'posts.isRead', 'posts.imageUrl', 'posts.podcast'])
        .leftJoin('postContents', 'posts.id', 'postContents.postId')
        .select(['postContents.content'])
        .innerJoin('feeds', 'posts.feedId', 'feeds.id')
        .select([sql<string>`COALESCE(feeds.memo, feeds.title)`.as('feedTitle'), 'feeds.icon as feedIcon', 'feeds.link as feedLink'])
        .where('posts.id', '=', postId)
        .executeTakeFirst();

    if (!row) return null;

    return {
        ...row,
        content: row?.content ?? '',
    };
});

ipcMain.handle('db-update-post-read-by-id', async (_event, postId, isRead) => {
    const post = await db.selectFrom('posts').select('feedId').where('id', '=', postId).executeTakeFirst();
    if (!post) return null;

    await db
        .updateTable('posts')
        .set({ isRead: (isRead ? 1 : 0) as 0 | 1 })
        .where('id', '=', postId)
        .execute();

    const row = await db
        .selectFrom('posts')
        .select(sql<number>`COUNT(*)`.as('count'))
        .where('feedId', '=', post.feedId)
        .where('isRead', '=', 0 as never)
        .executeTakeFirst();

    return { feedId: post.feedId, hasUnread: (row?.count ?? 0) > 0 };
});

ipcMain.handle('db-read-all-posts', async (_event, feedKey) => {
    if (!feedKey) return;

    const [prefix, idStr] = feedKey.split('-') as [FeedKeyPrefix, string];
    const id = Number(idStr);
    if (!Number.isFinite(id)) return;

    await db
        .updateTable('posts')
        .set({ isRead: 1 as 0 | 1 })
        .where('isRead', '=', 0 as never)
        .where(
            'feedId',
            'in',
            prefix === 'feed'
                ? [id]
                : db
                      .selectFrom('feeds')
                      .select('id')
                      .where(prefix === 'folder' ? 'folderId' : 'view', '=', id),
        )
        .execute();
});

// Folders

ipcMain.handle('db-get-folders', async () => {
    return db.selectFrom('folders').select(['id', 'name', 'view']).orderBy('name', 'asc').execute();
});

ipcMain.handle('db-create-folder', async (_event, folderName: string, view = 1) => {
    return db
        .insertInto('folders')
        .values({ name: folderName, view })
        .returning('id')
        .executeTakeFirstOrThrow()
        .then(row => row?.id);
});

ipcMain.handle('db-update-folder', async (_event, folderId, folderName: string) => {
    await db.updateTable('folders').set({ name: folderName }).where('id', '=', folderId).execute();
});

ipcMain.handle('db-delete-folder', async (_event, folderId: number) => {
    await db.deleteFrom('folders').where('id', '=', folderId).execute();
});
