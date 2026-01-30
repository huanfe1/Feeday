import { parseOpml } from 'feedsmith';
import type { Opml } from 'feedsmith/types';

export type FeedItem = Partial<{
    title: string;
    url: string;
    link: string;
    folder: string;
}>;

function traverseOutlines(outlines: Opml.Outline<Date>[], feeds: FeedItem[] = [], parentFolder?: string): FeedItem[] {
    outlines.forEach(outline => {
        if (Array.isArray(outline.outlines) && outline.outlines.length > 0) {
            traverseOutlines(outline.outlines, feeds, outline.text || parentFolder);
        } else if (outline.type === 'rss') {
            feeds.push({
                title: outline.text,
                url: outline.xmlUrl,
                link: outline.htmlUrl,
                folder: parentFolder,
            });
        }
    });
    return feeds;
}

export function parseOpmlContent(content: string): FeedItem[] {
    const opml = parseOpml(content);
    if (!opml.body?.outlines) return [];
    return traverseOutlines(opml.body?.outlines as Opml.Outline<Date>[]);
}
