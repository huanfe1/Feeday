import { parseOpml } from 'feedsmith';
import type { Opml } from 'feedsmith/types';

export type FeedItem = {
    title: string;
    url: string;
    link: string;
    folderName?: string;
};

function traverseOutlines(outlines: Opml.Outline<Date>[], feeds: FeedItem[] = [], parentFolder?: string): FeedItem[] {
    outlines.forEach(outline => {
        if (Array.isArray(outline.outlines) && outline.outlines.length > 0) {
            traverseOutlines(outline.outlines, feeds, outline.text || parentFolder);
        } else if (outline.type === 'rss' && outline.xmlUrl && outline.htmlUrl) {
            feeds.push({
                title: outline.text,
                url: outline.xmlUrl,
                link: outline.htmlUrl,
                folderName: parentFolder,
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

export type ExportFeedItem = {
    title: string;
    url: string;
    link: string;
    folderName?: string;
};

function escapeXml(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

export function buildOpmlContent(feeds: ExportFeedItem[], title = 'Feeday 订阅导出'): string {
    const byFolder = new Map<string | undefined, ExportFeedItem[]>();
    for (const feed of feeds) {
        const key = feed.folderName ?? undefined;
        if (!byFolder.has(key)) byFolder.set(key, []);
        byFolder.get(key)!.push(feed);
    }

    const outlineElements: string[] = [];

    // 无文件夹的订阅
    const noFolder = byFolder.get(undefined) ?? [];
    for (const f of noFolder) {
        outlineElements.push(`    <outline type="rss" text="${escapeXml(f.title)}" xmlUrl="${escapeXml(f.url)}" htmlUrl="${escapeXml(f.link)}"/>`);
    }

    // 有文件夹的订阅
    for (const [folderName, folderFeeds] of byFolder) {
        if (folderName === undefined) continue;
        const inner = folderFeeds.map(f => `      <outline type="rss" text="${escapeXml(f.title)}" xmlUrl="${escapeXml(f.url)}" htmlUrl="${escapeXml(f.link)}"/>`).join('\n');
        outlineElements.push(`    <outline text="${escapeXml(folderName)}" type="folder">\n${inner}\n    </outline>`);
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>${escapeXml(title)}</title>
  </head>
  <body>
${outlineElements.join('\n')}
  </body>
</opml>`;
}
