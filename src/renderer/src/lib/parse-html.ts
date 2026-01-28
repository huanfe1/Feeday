import type { Root } from 'hast';
import rehypeParse from 'rehype-parse';
import rehypeSanitize from 'rehype-sanitize';
import { unified } from 'unified';

export default function parseHtml(html: string): Root {
    return unified().use(rehypeParse, { fragment: true }).use(rehypeSanitize).parse(html);
}
