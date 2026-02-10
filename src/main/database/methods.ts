import dayjs from 'dayjs';
import type { Kysely } from 'kysely';
import { sql } from 'kysely';
import pLimit from 'p-limit';

import { fetchFeed } from '@/lib/rss';

import type { Database, Feeds, Podcast, PostContents, Posts } from './types';

export class DatabaseMethods {
    private db: Kysely<Database>;

    private fetchLimit = pLimit(5);
    private writeLimit = pLimit(1);

    constructor(db: Kysely<Database>) {
        this.db = db;
    }

    async insertFeed(feed: Feeds) {
        return this.db
            .insertInto('feeds')
            .values(feed)
            .onConflict(oc => oc.column('url').doNothing())
            .returning('id')
            .executeTakeFirst()
            .then(row => row?.id);
    }

    async updateFeed(feedId: number, feed: Omit<Partial<Feeds>, 'id'>) {
        const qb = this.db.updateTable('feeds').set(feed).where('id', '=', feedId);
        return qb.execute();
    }

    async insertPost(feedId: number, post: Omit<Posts, 'feedId' | 'podcast'> & PostContents & { podcast?: Podcast }) {
        const { content, podcast, ...postData } = post;

        // 跳过无效的 post（缺少必需字段）
        if (!postData.title || !postData.link) {
            console.warn('Skipping post with missing required fields:', postData);
            return;
        }

        return this.db.transaction().execute(async trx => {
            const values = {
                feedId,
                title: postData.title,
                link: postData.link,
                author: postData.author,
                imageUrl: postData.imageUrl,
                summary: postData.summary,
                pubDate: postData.pubDate,
                isRead: postData.isRead ?? 0,
                podcast: podcast?.url && JSON.stringify(podcast),
            };

            const postRow = await trx
                .insertInto('posts')
                .values(values)
                .onConflict(oc => oc.column('link').doNothing())
                .returning('id')
                .executeTakeFirst();

            if (postRow?.id && content) {
                await trx
                    .insertInto('postContents')
                    .values({ postId: postRow.id, content })
                    .onConflict(oc => oc.column('postId').doUpdateSet({ content }))
                    .execute();
                console.log('Insert Post', postData.title);
            }
        });
    }

    async refreshFeed(timeLimit: boolean = true) {
        const needFetchFeeds = (await this.db
            .selectFrom('feeds')
            .select(['id', 'url'])
            .where(eb => {
                const lastFetchMinutes = sql<number>`(strftime('%s', datetime('now', 'localtime')) - strftime('%s', last_fetch)) / 60`;
                const threshold = timeLimit ? eb.ref('fetchFrequency') : 5; // 固定值
                return eb.or([eb(lastFetchMinutes, '>', threshold), eb('lastFetch', 'is', null)]);
            })
            .execute()) as { id: number; url: string }[];
        console.log('Need Refresh Feeds Count:', needFetchFeeds.length);

        if (needFetchFeeds.length === 0) return;

        const tasks = needFetchFeeds.map(({ id, url }) => {
            return this.fetchLimit(async () => {
                try {
                    const result = await fetchFeed(url as string);
                    const { feed, posts } = result;
                    this.writeLimit(async () => {
                        await this.updateFeed(id, {
                            ...feed,
                            lastFetch: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                        });
                        await Promise.all(posts?.map(post => this.insertPost(id, post as any)) ?? []);
                    });
                } catch (error: unknown) {
                    this.writeLimit(async () => {
                        await this.updateFeed(id as number, {
                            lastFetchError: error instanceof Error ? error.message : String(error),
                            lastFetch: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                        });
                    });
                }
            });
        });
        return Promise.all(tasks).then(() => console.log('Refresh Feed Done'));
    }
}
