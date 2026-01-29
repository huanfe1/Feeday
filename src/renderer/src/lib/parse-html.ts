import rehypeParse from 'rehype-parse';
import rehypeSanitize from 'rehype-sanitize';
import { unified } from 'unified';

export default function parseHtml(html: string) {
    const processor = unified().use(rehypeParse, { fragment: true }).use(rehypeSanitize);
    const ast = processor.parse(html);
    return processor.runSync(ast);
}
