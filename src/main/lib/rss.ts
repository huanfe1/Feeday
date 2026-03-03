import type { IpcEvents } from '@shared/types/ipc';
import dayjs from 'dayjs';
import { net } from 'electron';
import { parseFeed } from 'feedsmith';

export async function fetchFeed(url: string, timeout: number = 20000): ReturnType<IpcEvents['fetch-feed-info']> {
    const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`获取订阅源超时: ${url}`)), timeout);
    });

    const fetchPromise = net
        .fetch(url)
        .then(res => res.text())
        .then(rssParser);

    return Promise.race([fetchPromise, timeoutPromise]);
}

function rssParser(data: string): Awaited<ReturnType<IpcEvents['fetch-feed-info']>> {
    const { format, feed } = parseFeed(data);
    if (format === 'rss') {
        const result = {
            feed: {
                title: feed.title,
                link: feed.link,
                url: feed.atom?.links?.find(_ => _.rel === 'self')?.href,
                description: feed.description,
                icon: feed.image?.url ?? feed.itunes?.image,
                lastUpdated: dayjs(feed.pubDate || feed.lastBuildDate).format('YYYY-MM-DD HH:mm:ss'),
            },
            posts: feed?.items?.map(item => {
                const podcastUrl = item.enclosures?.find(_ => _.type?.startsWith('audio'))?.url;
                const podcastImage = item.itunes?.image ?? feed.itunes?.image;
                return {
                    title: item.title,
                    link: getLink(item.guid?.value, item.link),
                    imageUrl: getImageUrl(item.enclosures?.find(_ => _.type?.startsWith('image'))?.url, item.content?.encoded, item.description),
                    author: item.dc?.creators?.join('、') || item.authors?.join(''),
                    pubDate: dayjs(item.pubDate).format('YYYY-MM-DD HH:mm:ss'),
                    summary: item.description,
                    content: item.content?.encoded,
                    podcast: podcastUrl ? { ...item.itunes, image: podcastImage, url: podcastUrl } : undefined,
                };
            }),
        };
        if (!result?.feed?.title) {
            throw new Error('Invalid feed data');
        }
        console.log(result.feed.title);
        return result as Awaited<ReturnType<IpcEvents['fetch-feed-info']>>;
    } else if (format === 'atom') {
        const result = {
            feed: {
                title: feed.title,
                link: getLink(feed?.links?.find(_ => _.rel === 'alternate')?.href, feed.id),
                url: feed?.links?.find(_ => _.rel === 'self')?.href,
                description: feed.subtitle,
                icon: feed.icon ?? feed.itunes?.image,
                lastUpdated: dayjs(feed.updated).format('YYYY-MM-DD HH:mm:ss'),
            },
            posts: feed?.entries?.map(item => {
                const podcastUrl = item.links?.find(_ => _.rel === 'enclosure' && _.type?.startsWith('audio'))?.href;
                const podcastImage = item.itunes?.image ?? feed.itunes?.image;
                return {
                    title: item.title,
                    link: getLink(item?.links?.find(_ => _.rel === 'alternate')?.href, item.id),
                    imageUrl: getImageUrl(item.links?.find(_ => _.rel === 'enclosure' && _.type?.startsWith('image'))?.href, item.content, item.summary),
                    author: item.authors?.map(_ => _.name).join('、'),
                    pubDate: dayjs(item.published || item.updated).format('YYYY-MM-DD HH:mm:ss'),
                    summary: item.summary,
                    content: item.content,
                    podcast: podcastUrl ? { ...item.itunes, url: podcastUrl, image: podcastImage } : undefined,
                };
            }),
        };
        if (!result.feed.title || !result.feed.link || !result.feed.url || !result.feed.description || !result.feed.icon || !result.feed.lastUpdated) {
            throw new Error('Invalid feed data');
        }
        return result as Awaited<ReturnType<IpcEvents['fetch-feed-info']>>;
    } else {
        console.error(`Invalid feed format: ${format}`);
        throw new Error('Invalid feed format');
    }
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
