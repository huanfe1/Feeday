import { db, dbMethods } from '@/database';
import { sql } from 'kysely';

import { settings } from '@/lib/settings';
import { ipcMain } from '@/lib/utils';

// Feeds

ipcMain.handle('db-get-feeds', async () => {
    return db
        .selectFrom('feeds')
        .leftJoin('posts', join => join.onRef('posts.feedId', '=', 'feeds.id').on('posts.isRead', '=', sql`0`))
        .select(sql<boolean>`CASE WHEN COUNT(posts.id) > 0 THEN 1 ELSE 0 END`.as('hasUnread'))
        .selectAll('feeds')
        .groupBy('feeds.id')
        .orderBy('feeds.title', 'asc')
        .execute()
        .then(result =>
            result.map(feed => ({
                ...feed,
                icon: feed.icon ? feed.icon : settings.get('avatarProxy')?.replace('${url}', new URL(feed.link as string).hostname),
            })),
        );
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

ipcMain.handle('db-get-posts', async (_event, params) => {
    const { onlyUnread, feedId, folderId, view } = params;
    const needsJoinFeeds = folderId != null || view != null;

    const query = db
        .selectFrom('posts')
        .$if(needsJoinFeeds, qb => qb.innerJoin('feeds', 'posts.feedId', 'feeds.id'))
        .select(['posts.id', 'posts.title', 'posts.link', 'posts.summary', 'posts.feedId', 'posts.author', 'posts.pubDate', 'posts.isRead', 'posts.imageUrl', 'posts.podcast'])
        .$if(onlyUnread, qb => qb.where('posts.isRead', '=', 0))
        .$if(feedId != null, qb => qb.where('posts.feedId', '=', feedId!))
        .$if(folderId != null, qb => qb.where(sql<boolean>`feeds.folder_id = ${folderId!}`))
        .$if(view != null, qb => qb.where(sql<boolean>`feeds.view = ${view!}`))
        .orderBy('posts.isRead', 'asc')
        .orderBy('posts.pubDate', 'desc');

    const rows = await query.execute();
    return rows.map(post => ({
        ...post,
        summary: post.summary ?? '',
    }));
});

ipcMain.handle('db-insert-post', async (_event, feed_id, post) => {
    return dbMethods.insertPost(feed_id, post);
});

ipcMain.handle('db-get-post-content-by-id', async (_event, postId) => {
    return db
        .selectFrom('postContents')
        .select('content')
        .where('postId', '=', postId)
        .executeTakeFirst()
        .then(row => row?.content ?? '');
});

ipcMain.handle('db-update-post-read-by-id', async (_event, postId, isRead) => {
    await db
        .updateTable('posts')
        .set({ isRead: isRead ? 1 : 0 })
        .where('id', '=', postId)
        .execute();
});

ipcMain.handle('db-read-all-posts', async (_event, feedId, folderId) => {
    const feeds = folderId != null ? await db.selectFrom('feeds').select(['id']).where('folderId', '=', folderId).execute() : [];
    await db
        .updateTable('posts')
        .set({ isRead: 1 })
        .$if(folderId != null && feeds.length > 0, qb =>
            qb.where(
                'feedId',
                'in',
                feeds.map(f => f.id as number),
            ),
        )
        .$if(folderId == null && feedId != null, qb => qb.where('feedId', '=', feedId!))
        .$if(folderId == null && feedId == null, qb => qb.where('isRead', '=', 0))
        .$if(folderId != null && feeds.length === 0, qb => qb.where(sql<boolean>`1 = 0`))
        .execute();
});

// Folders

ipcMain.handle('db-get-folders', async () => {
    return db.selectFrom('folders').select(['id', 'name']).orderBy('name', 'asc').execute();
});

ipcMain.handle('db-insert-folder', async (_event, folder_name) => {
    return db
        .insertInto('folders')
        .values({ name: folder_name })
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
