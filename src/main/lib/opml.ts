import { XMLParser } from 'fast-xml-parser';
import { readFileSync } from 'fs';

export type OPMLFeed = {
    title: string;
    xmlUrl: string;
    htmlUrl?: string;
    folder?: string;
};

type OPMLOutline = {
    '@_title'?: string;
    '@_text'?: string;
    '@_xmlUrl'?: string;
    '@_htmlUrl'?: string;
    '@_type'?: string;
    outline?: OPMLOutline | OPMLOutline[];
};

type OPMLRoot = {
    opml?: {
        body?: {
            outline?: OPMLOutline | OPMLOutline[];
        };
    };
};

/**
 * 解析 OPML 内容
 * @param content OPML 文件内容
 * @returns 解析后的 feed 列表
 */
function parseOPMLContent(content: string): OPMLFeed[] {
    const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
    });
    const parsed = parser.parse(content) as OPMLRoot;

    const feeds: OPMLFeed[] = [];
    const body = parsed.opml?.body;
    if (!body) {
        throw new Error('OPML 文件格式错误：缺少 body 元素');
    }

    // 递归遍历所有 outline 元素
    function traverseOutlines(outlines: OPMLOutline | OPMLOutline[] | undefined, parentFolder?: string): void {
        if (!outlines) return;

        const outlineArray = Array.isArray(outlines) ? outlines : [outlines];

        for (const outline of outlineArray) {
            const xmlUrl = outline['@_xmlUrl'];
            const title = outline['@_title'] || outline['@_text'] || '';
            const htmlUrl = outline['@_htmlUrl'];

            // 如果有 xmlUrl，说明这是一个 feed
            if (xmlUrl) {
                feeds.push({
                    title: title || '',
                    xmlUrl: xmlUrl,
                    htmlUrl: htmlUrl || undefined,
                    folder: parentFolder || undefined,
                });
            }

            // 递归处理子元素
            if (outline.outline) {
                const currentFolder = xmlUrl ? parentFolder : title || parentFolder;
                traverseOutlines(outline.outline, currentFolder);
            }
        }
    }

    traverseOutlines(body.outline);

    return feeds;
}

/**
 * 解析 OPML 文件
 * @param filePath OPML 文件路径
 * @returns 解析后的 feed 列表
 */
export function parseOPML(filePath: string): OPMLFeed[] {
    try {
        const content = readFileSync(filePath, 'utf-8');
        return parseOPMLContent(content);
    } catch (error) {
        throw new Error(`解析 OPML 文件失败: ${(error as Error).message}`);
    }
}

/**
 * 解析 OPML 内容字符串
 * @param content OPML 文件内容字符串
 * @returns 解析后的 feed 列表
 */
export function parseOPMLFromContent(content: string): OPMLFeed[] {
    try {
        return parseOPMLContent(content);
    } catch (error) {
        throw new Error(`解析 OPML 内容失败: ${(error as Error).message}`);
    }
}
