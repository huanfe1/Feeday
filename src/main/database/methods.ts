import type { Database, Feeds, InsertPost } from '@shared/types/database';
import dayjs from 'dayjs';
import { toString } from 'hast-util-to-string';
import type { Insertable, Kysely, Updateable } from 'kysely';
import { sql } from 'kysely';
import pLimit from 'p-limit';
import rehypeParse from 'rehype-parse';
import rehypeSanitize from 'rehype-sanitize';
import { unified } from 'unified';

import { fetchFeed } from '@/lib/rss';
import { settings } from '@/lib/settings';
import { getFeedFetchUrl, truncate } from '@/lib/utils';

const plainTextProcessor = unified().use(rehypeParse, { fragment: true }).use(rehypeSanitize);

function sanitizeFeedDescription(description: string | null | undefined): string | null {
    if (description == null) return null;

    const trimmed = description.trim();
    if (!trimmed) return null;

    const ast = plainTextProcessor.parse(trimmed);
    const sanitizedAst = plainTextProcessor.runSync(ast);
    const text = toString(sanitizedAst).replace(/\s+/g, ' ').trim();

    return text || null;
}

export class DatabaseMethods {
    private db: Kysely<Database>;

    private fetchLimit = pLimit(5);
    private writeLimit = pLimit(1);

    constructor(db: Kysely<Database>) {
        this.db = db;
    }

    async insertFeed(feed: Insertable<Feeds>) {
        const sanitizedFeed: Insertable<Feeds> = {
            ...feed,
            description: sanitizeFeedDescription(feed.description),
        };

        return this.db
            .insertInto('feeds')
            .values(sanitizedFeed)
            .onConflict(oc => oc.column('url').doNothing())
            .returning('id')
            .executeTakeFirst()
            .then(row => row?.id);
    }

    async updateFeed(feedId: number, feed: Updateable<Feeds>) {
        const sanitizedFeed: Updateable<Feeds> = {
            ...feed,
            ...(Object.prototype.hasOwnProperty.call(feed, 'description') ? { description: sanitizeFeedDescription(feed.description) } : {}),
        };

        await this.db.updateTable('feeds').set(sanitizedFeed).where('id', '=', feedId).execute();
    }

    async insertPost(feedId: number, post: InsertPost) {
        const { podcast, ...postData } = post;

        if (!postData.title || !postData.link) {
            console.warn('Skipping post with missing required fields:', postData);
            return;
        }

        const rawSummarySource = post.summary || post.content || '';
        postData.summary = truncate(rawSummarySource) ?? '';

        const contentToStore = post.content || post.summary || '';

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
                podcast: podcast?.url ? JSON.stringify(podcast) : undefined,
            };

            const postRow = await trx
                .insertInto('posts')
                .values(values)
                .onConflict(oc => oc.columns(['feedId', 'link']).doNothing())
                .returning('id')
                .executeTakeFirst();

            if (postRow?.id && contentToStore) {
                await trx
                    .insertInto('postContents')
                    .values({ postId: postRow.id, content: contentToStore })
                    .onConflict(oc => oc.column('postId').doUpdateSet({ content: contentToStore }))
                    .execute();
                console.log('Insert Post', postData.title);
            }
        });
    }

    async refreshFeed(timeLimit: boolean = true) {
        const needFetchFeeds = (await this.db
            .selectFrom('feeds')
            .select(['id', 'url', 'type'])
            .where(eb => {
                const lastFetchMinutes = sql<number>`(strftime('%s', datetime('now', 'localtime')) - strftime('%s', last_fetch)) / 60`;
                const threshold = timeLimit ? eb.ref('fetchFrequency') : 5; // 固定值
                return eb.or([eb(lastFetchMinutes, '>', threshold), eb('lastFetch', 'is', null)]);
            })
            .execute()) as { id: number; url: string; type: number }[];
        console.log('Need Refresh Feeds Count:', needFetchFeeds.length);

        if (needFetchFeeds.length === 0) return;

        const rsshubSource = settings.get('rsshubSource') ?? 'https://rsshub.app';

        const tasks = needFetchFeeds.map(({ id, url, type }) => {
            const fetchUrl = getFeedFetchUrl(url, type as 0 | 1, rsshubSource);
            return this.fetchLimit(async () => {
                try {
                    const result = await fetchFeed(fetchUrl);
                    const { feed, posts } = result;
                    await this.writeLimit(async () => {
                        const { url: _, link: __, type: ___, ...feedWithoutUniqueFields } = feed;
                        // 仅更新 title 等源数据，不覆盖用户自定义的 memo
                        await this.updateFeed(id, {
                            title: feedWithoutUniqueFields.title,
                            description: feedWithoutUniqueFields.description,
                            lastUpdated: feedWithoutUniqueFields.lastUpdated,
                            icon: feedWithoutUniqueFields.icon,
                            lastFetch: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                            lastFetchError: null,
                        });
                    });
                    await Promise.all(posts?.map(post => this.writeLimit(() => this.insertPost(id, post as any))) ?? []);
                } catch (error: unknown) {
                    await this.writeLimit(async () => {
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
