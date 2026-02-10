import { db, dbMethods } from '@/database';
import { ipcMain } from 'electron';
import { toString } from 'hast-util-to-string';
import { sql } from 'kysely';
import rehypeParse from 'rehype-parse';
import { unified } from 'unified';

import { settings } from '@/lib/settings';
import { truncate } from '@/lib/utils';

function getSummary(summary: string, view?: number): string {
    if (view === 2) return summary;
    if (!summary) return '';
    const result = unified().use(rehypeParse, { fragment: true }).parse(summary.slice(0, 500));
    return truncate(toString(result)) ?? '';
}

// Feeds

ipcMain.handle('db-get-feeds', async () => {
    return db
        .selectFrom('feeds')
        .leftJoin('posts', join => join.onRef('posts.feedId', '=', 'feeds.id').on('posts.isRead', '=', sql`0`))
        .select(sql<number>`CASE WHEN COUNT(posts.id) > 0 THEN 1 ELSE 0 END`.as('hasUnread'))
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

ipcMain.handle('db-update-feed', async (_event, feedId: number, feed) => {
    return dbMethods.updateFeed(feedId, feed);
});

ipcMain.handle('db-delete-feed', async (_event, feedId: number) => {
    return db.deleteFrom('feeds').where('id', '=', feedId).execute();
});

ipcMain.handle('db-insert-post', async (_event, feed_id: number, post) => {
    return dbMethods.insertPost(feed_id, post);
});

// Posts

type GetPostsParams = {
    onlyUnread: boolean;
    feedId?: number;
    folderId?: number;
    view: number;
};
ipcMain.handle('db-get-posts', async (_event, params: GetPostsParams) => {
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
        summary: getSummary(post.summary ?? '', view),
    }));
});

ipcMain.handle('db-get-post-content-by-id', async (_event, postId: number) => {
    return db
        .selectFrom('posts')
        .leftJoin('postContents', 'posts.id', 'postContents.postId')
        .select(['posts.summary', 'postContents.content'])
        .where('posts.id', '=', postId)
        .executeTakeFirst();
});

ipcMain.handle('db-update-post-read-by-id', async (_event, post_id: number, is_read: boolean) => {
    return db
        .updateTable('posts')
        .set({ isRead: is_read ? 1 : 0 })
        .where('id', '=', post_id)
        .execute();
});

ipcMain.handle('db-read-all-posts', async (_event, feed_id?: number, folder_id?: number) => {
    const feeds = folder_id != null ? await db.selectFrom('feeds').select(['id']).where('folderId', '=', folder_id).execute() : [];
    return db
        .updateTable('posts')
        .set({ isRead: 1 })
        .$if(folder_id != null && feeds.length > 0, qb =>
            qb.where(
                'feedId',
                'in',
                feeds.map(f => f.id as number),
            ),
        )
        .$if(folder_id == null && feed_id != null, qb => qb.where('feedId', '=', feed_id!))
        .$if(folder_id == null && feed_id == null, qb => qb.where('isRead', '=', 0))
        .$if(folder_id != null && feeds.length === 0, qb => qb.where(sql<boolean>`1 = 0`))
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

ipcMain.handle('db-update-folder', async (_event, folder_id: number, folder_name: string) => {
    return db.updateTable('folders').set({ name: folder_name }).where('id', '=', folder_id).execute();
});

ipcMain.handle('db-delete-folder', async (_event, folderId: number) => {
    return db.deleteFrom('folders').where('id', '=', folderId).execute();
});
