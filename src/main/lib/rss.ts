import dayjs from 'dayjs';
import { net } from 'electron';
import { parseFeed } from 'feedsmith';

export async function fetchFeed(url: string, timeout: number = 20000) {
    const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`获取订阅源超时: ${url}`)), timeout);
    });

    const fetchPromise = net
        .fetch(url)
        .then(res => res.text())
        .then(rssParser);

    return Promise.race([fetchPromise, timeoutPromise]);
}

function rssParser(data: string) {
    const { format, feed } = parseFeed(data);
    if (format === 'rss') {
        return {
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
                    imageUrl: item.enclosures?.find(_ => _.type?.startsWith('image'))?.url,
                    author: item.dc?.creators?.join('、') || item.authors?.join(''),
                    pubDate: dayjs(item.pubDate).format('YYYY-MM-DD HH:mm:ss'),
                    summary: item.description,
                    content: item.content?.encoded,
                    podcast: podcastUrl ? { ...item.itunes, image: podcastImage, url: podcastUrl } : undefined,
                };
            }),
        };
    } else if (format === 'atom') {
        return {
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
                    imageUrl: item.links?.find(_ => _.rel === 'enclosure' && _.type?.startsWith('image'))?.href,
                    author: item.authors?.map(_ => _.name).join('、'),
                    pubDate: dayjs(item.updated || item.published).format('YYYY-MM-DD HH:mm:ss'),
                    summary: item.summary,
                    content: item.content,
                    podcast: podcastUrl ? { ...item.itunes, url: podcastUrl, image: podcastImage } : undefined,
                };
            }),
        };
    } else {
        console.error(`Invalid feed format: ${format}`);
        throw new Error('Invalid feed format');
    }
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
