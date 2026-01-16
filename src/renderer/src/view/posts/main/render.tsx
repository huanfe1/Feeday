import parse, { Element } from 'html-react-parser';
import type { HTMLReactParserOptions } from 'html-react-parser';
import { memo } from 'react';
import sanitizeHtml from 'sanitize-html';

function Render({ content }: { content: string }) {
    const options: HTMLReactParserOptions = {
        replace: domNode => {
            if (domNode instanceof Element && domNode.attribs) {
                if (domNode.name === 'a') {
                    const href = domNode.attribs.href?.replace(/^.*http/, 'http')?.replace('javascript:', '') || '';
                    return (
                        <a href={href} className="no-underline hover:underline" target="_blank" rel="noopener noreferrer">
                            {domNode.children.map(child => (child.type === 'text' ? child.data : null))}
                        </a>
                    );
                }
                if (domNode.name === 'h1') {
                    return <h2>{domNode.children.map(child => (child.type === 'text' ? child.data : null))}</h2>;
                }
            }
            return null;
        },
    };
    return parse(
        sanitizeHtml(content, {
            allowedAttributes: {
                '*': ['href', 'src', 'alt', 'class', 'title'],
                a: ['href', 'target', 'rel'],
                img: ['src', 'alt', 'title', 'width', 'height'],
            },
        }),
        options,
    );
}

export default memo(Render);
