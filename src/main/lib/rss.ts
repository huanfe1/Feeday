import type { Podcast } from '@shared/types/database';
import type { FetchFeedPostsResult, FetchFeedResult, IpcEvents } from '@shared/types/ipc';
import dayjs from 'dayjs';
import { app, net } from 'electron';
import { parseFeed } from 'feedsmith';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const PARSE_FAILURES_DIR = 'feed-parse-failures';

function saveParseFailure(url: string, rawContent: string, error: unknown): void {
    try {
        const dir = join(app.getPath('userData'), PARSE_FAILURES_DIR);
        mkdirSync(dir, { recursive: true });

        const sanitizedUrl = url.replace(/[^a-zA-Z0-9.-]/g, '_').slice(0, 100);
        const timestamp = dayjs().format('YYYY-MM-DD_HH-mm-ss');
        const ext = rawContent.trimStart().startsWith('<?xml') || rawContent.includes('<rss') || rawContent.includes('<feed') ? 'xml' : 'txt';
        const filename = `${timestamp}_${sanitizedUrl}.${ext}`;
        const filepath = join(dir, filename);

        const errorInfo = `<!--
Parse failed at: ${dayjs().format('YYYY-MM-DD HH:mm:ss')}
URL: ${url}
Error: ${error instanceof Error ? error.message : String(error)}
-->

`;
        writeFileSync(filepath, errorInfo + rawContent, 'utf-8');
        console.error(`[RSS] 解析失败，原始内容已保存至: ${filepath}`);
    } catch (saveErr) {
        console.error('[RSS] 保存解析失败内容时出错:', saveErr);
    }
}

export async function fetchFeed(
    url: string,
    options?: { timeout?: number; signal?: AbortSignal },
): ReturnType<IpcEvents['fetch-feed-info']> {
    const timeout = options?.timeout ?? 30000;
    const signal = options?.signal;

    const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`获取订阅源超时: ${url}`)), timeout);
    });

    const fetchPromise = net
        .fetch(url, { signal })
        .then(res => res.text())
        .then(rawContent => {
            try {
                return rssParser(rawContent);
            } catch (error) {
                saveParseFailure(url, rawContent, error);
                throw error;
            }
        });

    return Promise.race([fetchPromise, timeoutPromise]);
}

function formatDate(value: unknown): string | null {
    if (value == null) return null;
    const d = dayjs(value as string | number | Date);
    return d.isValid() ? d.format('YYYY-MM-DD HH:mm:ss') : null;
}

function toPodcast(url: string | undefined, image?: string, extra?: Record<string, unknown>): Podcast | null {
    if (!url?.trim()) return null;
    return {
        url,
        image: image ?? (extra?.image as string | undefined),
        duration: extra?.duration as number | undefined,
        title: extra?.title as string | undefined,
        author: extra?.author as string | undefined,
    };
}

function extractContent(value: unknown): string | undefined {
    if (value == null) return undefined;
    if (typeof value === 'string') return value;
    if (typeof value === 'object' && 'value' in value && typeof (value as { value?: string }).value === 'string') {
        return (value as { value: string }).value;
    }
    return undefined;
}

function normalizeFeed(feed: Partial<FetchFeedResult>): FetchFeedResult {
    const title = feed.title?.trim() || '未命名订阅源';
    const link = feed.link?.trim() || '';
    const url = feed.url?.trim() || link;

    if (!link) {
        throw new Error('Invalid feed data: missing required link');
    }

    return {
        title,
        description: feed.description?.trim() ?? null,
        link,
        url,
        lastUpdated: feed.lastUpdated ?? null,
        icon: feed.icon?.trim() ?? null,
        type: 0,
    };
}

function normalizePost(post: Partial<FetchFeedPostsResult>): FetchFeedPostsResult {
    const title = post.title?.trim() || '无标题';
    const link = post.link?.trim() || '';

    if (!link) {
        throw new Error('Invalid post data: missing required link');
    }

    return {
        title,
        link,
        author: post.author?.trim() ?? null,
        imageUrl: post.imageUrl?.trim() ?? null,
        summary: post.summary?.trim() ?? null,
        podcast: post.podcast ?? null,
        pubDate: post.pubDate ?? null,
        ...(post.content != null && { content: post.content }),
    };
}

function rssParser(data: string): Awaited<ReturnType<IpcEvents['fetch-feed-info']>> {
    const { format, feed } = parseFeed(data);

    if (format === 'rss') {
        const feedResult = normalizeFeed({
            title: feed.title,
            link: feed.link,
            url: feed.atom?.links?.find(l => l.rel === 'self')?.href,
            description: feed.description,
            icon: feed.image?.url ?? feed.itunes?.image,
            lastUpdated: formatDate(feed.pubDate ?? feed.lastBuildDate),
        });

        const posts: FetchFeedPostsResult[] = (feed?.items ?? []).map(item => {
            const podcastUrl = item.enclosures?.find(e => e.type?.startsWith('audio'))?.url;
            const podcastImage = item.itunes?.image ?? feed.itunes?.image;
            const podcast = toPodcast(podcastUrl, podcastImage, item.itunes);

            return normalizePost({
                title: item.title,
                link: getLink(item.guid?.value, item.link),
                imageUrl: getImageUrl(item.enclosures?.find(e => e.type?.startsWith('image'))?.url, item.content?.encoded, item.description),
                author: item.dc?.creators?.join('、') || item.authors?.join('') || null,
                pubDate: formatDate(item.pubDate),
                summary: item.description,
                content: item.content?.encoded,
                podcast,
            });
        });

        return { feed: feedResult, posts };
    }

    if (format === 'atom') {
        const feedLink = getLink(feed?.links?.find(l => l.rel === 'alternate')?.href, feed.id);
        const feedUrl = feed?.links?.find(l => l.rel === 'self')?.href;

        const feedResult = normalizeFeed({
            title: feed.title,
            link: feedLink,
            url: feedUrl,
            description: feed.subtitle,
            icon: feed.icon ?? feed.itunes?.image,
            lastUpdated: formatDate(feed.updated),
        });

        const posts: FetchFeedPostsResult[] = (feed?.entries ?? []).map(item => {
            const enclosureLink = item.links?.find(l => l.rel === 'enclosure' && l.type?.startsWith('audio'));
            const podcastUrl = enclosureLink?.href;
            const podcastImage = item.itunes?.image ?? feed.itunes?.image;
            const podcast = toPodcast(podcastUrl, podcastImage, item.itunes);

            return normalizePost({
                title: item.title,
                link: getLink(item?.links?.find(l => l.rel === 'alternate')?.href, item.id),
                imageUrl: getImageUrl(item.links?.find(l => l.rel === 'enclosure' && l.type?.startsWith('image'))?.href, item.content, item.summary),
                author: item.authors?.map(a => a.name).join('、') || null,
                pubDate: formatDate(item.published ?? item.updated),
                summary: item.summary,
                content: extractContent(item.content),
                podcast,
            });
        });

        return { feed: feedResult, posts };
    }

    if (format === 'json') {
        type JsonItem = {
            id?: string;
            url?: string;
            external_url?: string;
            title?: string;
            content_html?: string;
            content_text?: string;
            summary?: string;
            image?: string;
            date_published?: unknown;
            date_modified?: unknown;
            authors?: Array<{ name?: string }>;
            attachments?: Array<{ url: string; mime_type: string }>;
        };
        const jsonFeed = feed as {
            title?: string;
            home_page_url?: string;
            feed_url?: string;
            description?: string;
            icon?: string;
            favicon?: string;
            items?: JsonItem[];
        };
        const feedUrl = jsonFeed.feed_url ?? jsonFeed.home_page_url;

        const feedResult = normalizeFeed({
            title: jsonFeed.title,
            link: jsonFeed.home_page_url ?? jsonFeed.feed_url ?? '',
            url: feedUrl,
            description: jsonFeed.description,
            icon: jsonFeed.icon ?? jsonFeed.favicon,
            lastUpdated: null,
        });

        const posts: FetchFeedPostsResult[] = (jsonFeed.items ?? []).map(item => {
            const audioAttachment = item.attachments?.find(a => a.mime_type?.startsWith('audio'));
            const podcast = toPodcast(audioAttachment?.url, item.image);

            return normalizePost({
                title: item.title,
                link: getLink(item.url, item.external_url, item.id),
                imageUrl: item.image,
                author: item.authors?.map(a => a.name).join('、') || null,
                pubDate: formatDate(item.date_published ?? item.date_modified),
                summary: item.summary,
                content: item.content_html ?? item.content_text,
                podcast,
            });
        });

        return { feed: feedResult, posts };
    }

    if (format === 'rdf') {
        type RdfItem = {
            title?: string;
            link?: string;
            description?: string;
            content?: { encoded?: string };
            dc?: { creators?: string[] };
            atom?: { published?: unknown; updated?: unknown };
            dcterms?: { created?: unknown; modified?: unknown };
        };
        const rdfFeed = feed as {
            title?: string;
            link?: string;
            description?: string;
            image?: { url?: string };
            items?: RdfItem[];
        };

        const feedResult = normalizeFeed({
            title: rdfFeed.title,
            link: rdfFeed.link,
            url: rdfFeed.link,
            description: rdfFeed.description,
            icon: rdfFeed.image?.url,
            lastUpdated: null,
        });

        const posts: FetchFeedPostsResult[] = (rdfFeed.items ?? []).map(item => {
            const pubDate = item.atom?.published ?? item.atom?.updated ?? item.dcterms?.created ?? item.dcterms?.modified;
            return normalizePost({
                title: item.title,
                link: getLink(item.link),
                imageUrl: undefined,
                author: item.dc?.creators?.join('、') || null,
                pubDate: formatDate(pubDate),
                summary: item.description,
                content: item.content?.encoded,
                podcast: null,
            });
        });

        return { feed: feedResult, posts };
    }

    console.error(`[RSS] 不支持的订阅格式: ${format}`);
    throw new Error(`不支持的订阅格式: ${format}`);
}

function extractFirstImageFromHtml(html: string | undefined): string | undefined {
    if (!html || typeof html !== 'string') return undefined;
    const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
    return match?.[1]?.trim();
}

function getImageUrl(
    primary: string | undefined,
    fallbackContent: string | { value?: string } | undefined,
    fallbackSummary: string | { value?: string } | undefined,
): string | undefined {
    if (primary) return primary;
    const content = typeof fallbackContent === 'string' ? fallbackContent : fallbackContent?.value;
    const summary = typeof fallbackSummary === 'string' ? fallbackSummary : fallbackSummary?.value;
    return extractFirstImageFromHtml(content) ?? extractFirstImageFromHtml(summary);
}

function getLink(...props: unknown[]): string {
    for (const prop of props) {
        if (typeof prop === 'string' && prop.trim().toLowerCase().startsWith('http')) {
            return prop;
        }
    }
    for (const prop of props) {
        if (typeof prop === 'string' && prop.trim()) {
            return prop;
        }
    }
    return '';
}
