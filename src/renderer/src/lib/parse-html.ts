import rehypeParse from 'rehype-parse';
import rehypeSanitize from 'rehype-sanitize';
import { unified } from 'unified';

export default function parseHtml(html: string) {
    return unified().use(rehypeParse, { fragment: true }).use(rehypeSanitize).parse(html);
}
