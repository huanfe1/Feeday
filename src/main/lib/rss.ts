import type { FeedType, PostType } from '@main/database/types';
import dayjs from 'dayjs';
import { net } from 'electron';
import { parseFeed } from 'feedsmith';

async function validateIcon(iconUrl: string): Promise<string | undefined> {
    try {
        // 使用 Promise.race 实现超时
        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Timeout')), 5000);
        });

        const fetchPromise = net.fetch(iconUrl, {
            method: 'HEAD',
        });

        const response = await Promise.race([fetchPromise, timeoutPromise]);

        // 如果状态码是 2xx 或 3xx，认为可以访问
        if (response.ok || (response.status >= 300 && response.status < 400)) {
            return iconUrl;
        }
        return undefined;
    } catch {
        // 如果请求失败或超时，返回 undefined
        return undefined;
    }
}

export async function fetchFeed(url: string) {
    const data = await fetch(url).then(res => res.text());
    const result = rssParser(data);

    // 验证 icon 是否可以访问
    if (result?.icon) {
        result.icon = await validateIcon(result.icon);
    }

    return result;
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
                link: item.link,
                image_url: item.enclosures?.[0]?.url,
                author: item.dc?.creators?.join('、') || item.authors?.join(''),
                pub_date: dayjs(item.pubDate).format('YYYY-MM-DD HH:mm:ss'),
                summary: item.description,
                content: item.content?.encoded,
            })),
        };
    } else if (format === 'atom') {
        return {
            title: feed.title,
            link: feed.id,
            url: feed?.links?.find(_ => _.rel === 'self')?.href,
            description: feed.subtitle,
            icon: feed.icon,
            last_updated: dayjs(feed.updated).format('YYYY-MM-DD HH:mm:ss'),
            items: feed?.entries?.map(item => ({
                title: item.title,
                link: item.id,
                image_url: item.links?.find(_ => _.rel === 'enclosure')?.href,
                author: item.authors?.map(_ => _.name).join('、'),
                pub_date: dayjs(item.updated || item.published).format('YYYY-MM-DD HH:mm:ss'),
                summary: item.summary,
                content: item.content,
            })),
        };
    }
    console.error(`Invalid feed format: ${format}`);
    throw new Error('Invalid feed format');
}
