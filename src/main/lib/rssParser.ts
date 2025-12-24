import dayjs from 'dayjs';
import { parseFeed } from 'feedsmith';

export default function rssParser(data: string) {
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
                pubDate: dayjs(item.pubDate).format('YYYY-MM-DD HH:mm:ss'),
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
                pubDate: dayjs(item.updated || item.published).format('YYYY-MM-DD HH:mm:ss'),
                summary: item.summary,
                content: item.content,
            })),
        };
    }
    return null;
}
