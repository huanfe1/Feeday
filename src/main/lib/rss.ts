import type { FeedType, PostType } from '@main/database/types';
import dayjs from 'dayjs';
import { net } from 'electron';
import { parseFeed } from 'feedsmith';

export async function fetchFeed(url: string, timeout: number = 10000) {
    // 添加超时控制
    const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`获取订阅源超时: ${url}`)), timeout);
    });

    const fetchPromise = net
        .fetch(url)
        .then(res => res.text())
        .then(async data => {
            const result = rssParser(data);
            if (!result.icon && result.link) {
                result.icon = `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${new URL(result.link).origin}&size=64`;
                net.fetch(result.icon).then(res => {
                    if (!res.ok) result.icon = undefined;
                });
            }
            return result;
        });

    return Promise.race([fetchPromise, timeoutPromise]);
}

export function rssParser(data: string): Partial<FeedType> & { items?: Partial<PostType>[] } {
    const { format, feed } = parseFeed(data);
    if (format === 'rss') {
        return {
            title: feed.title,
            link: feed.link,
            url: feed.atom?.links?.find(_ => _.rel === 'self')?.href,
            description: feed.description,
            icon: feed.image?.url,
            last_updated: dayjs(feed.pubDate || feed.lastBuildDate).format('YYYY-MM-DD HH:mm:ss'),
            items: feed?.items?.map(item => ({
                title: item.title,
                link: getLink(item.guid?.value, item.link),
                image_url: item.enclosures?.find(_ => _.type?.startsWith('image'))?.url,
                author: item.dc?.creators?.join('、') || item.authors?.join(''),
                pub_date: dayjs(item.pubDate).format('YYYY-MM-DD HH:mm:ss'),
                summary: item.description,
                content: item.content?.encoded,
                podcast: {
                    ...item.itunes,
                    url: item.enclosures?.find(_ => _.type?.startsWith('audio'))?.url,
                },
            })),
        };
    } else if (format === 'atom') {
        return {
            title: feed.title,
            link: getLink(feed?.links?.find(_ => _.rel === 'alternate')?.href, feed.id),
            url: feed?.links?.find(_ => _.rel === 'self')?.href,
            description: feed.subtitle,
            icon: feed.icon,
            last_updated: dayjs(feed.updated).format('YYYY-MM-DD HH:mm:ss'),
            items: feed?.entries?.map(item => ({
                title: item.title,
                link: getLink(item?.links?.find(_ => _.rel === 'alternate')?.href, item.id),
                image_url: item.links?.find(_ => _.rel === 'enclosure' && _.type?.startsWith('image'))?.href,
                author: item.authors?.map(_ => _.name).join('、'),
                pub_date: dayjs(item.updated || item.published).format('YYYY-MM-DD HH:mm:ss'),
                summary: item.summary,
                content: item.content,
                podcast: {
                    ...item.itunes,
                    url: item.links?.find(_ => _.rel === 'enclosure' && _.type?.startsWith('audio'))?.href,
                },
            })),
        };
    }
    console.error(`Invalid feed format: ${format}`);
    throw new Error('Invalid feed format');
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
