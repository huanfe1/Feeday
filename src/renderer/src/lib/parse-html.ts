import rehypeParse from 'rehype-parse';
import rehypeSanitize from 'rehype-sanitize';
import { unified } from 'unified';

const htmlProcessor = unified().use(rehypeParse, { fragment: true }).use(rehypeSanitize);

export default function parseHtml(html: string) {
    const ast = htmlProcessor.parse(html);
    return htmlProcessor.runSync(ast);
}
