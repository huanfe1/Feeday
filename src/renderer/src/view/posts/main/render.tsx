import type { AudioTrack } from '@/store';
import { useAudioStore } from '@/store';
import type { ElementContent } from 'hast';
import { toJsxRuntime } from 'hast-util-to-jsx-runtime';
import { h } from 'hastscript';
import { memo, useMemo } from 'react';
import { Fragment, jsx, jsxs } from 'react/jsx-runtime';
import { visit } from 'unist-util-visit';

import parseHtml from '@/lib/parse-html';

function PodcastTime({ audio, ...props }: React.ComponentProps<'span'> & { audio: AudioTrack | null }) {
    const handleClickTime = (time: string) => {
        const postId = useAudioStore.getState().postId;
        const duration = useAudioStore.getState().duration;

        if (!audio?.podcast?.url || postId !== audio.postId) return;

        const parts = time.split(':').map(Number);
        const seconds = parts.reduce((acc, cur) => acc * 60 + cur, 0);
        if (seconds > (audio?.podcast?.duration ?? duration)) return;

        useAudioStore.getState().setCurrentTime(seconds);
    };

    const children = props.children as string;
    if (typeof children === 'string' && /^\d{1,2}:\d{2}(?::\d{2})?$/.test(children)) {
        return (
            <span className="cursor-pointer font-semibold text-blue-500 hover:underline" data-role="podcast-time" onClick={() => handleClickTime(children)}>
                {children}
            </span>
        );
    }
    return <span>{children}</span>;
}

function Render({ content, audio }: { content: string; audio: AudioTrack | null }) {
    const components = {
        a: (props: React.ComponentProps<'a'>) => (
            <a href={props.href} rel="noopener noreferrer" target="_blank">
                {props.children}
            </a>
        ),
        h1: (props: React.ComponentProps<'h2'>) => <h2 {...props} />,
        img: (props: React.ComponentProps<'img'>) => <img {...props} loading="lazy" />,
        'podcast-time': (props: React.ComponentProps<'span'>) => <PodcastTime {...props} audio={audio} />,
    };

    const tree = useMemo(() => {
        const tree = parseHtml(content);
        if (audio?.podcast?.url) {
            visit(tree, 'element', (node, index, parent) => {
                if (parent && typeof index === 'number' && node.children[0]?.type === 'text') {
                    const textContent = node.children[0]?.value;
                    if (/\d{1,2}:\d{2}(?::\d{2})?/.test(textContent)) {
                        const result: ElementContent[] = textContent.split(/\d{1,2}:\d{2}(?::\d{2})?/).map(item => ({ type: 'text', value: item }));
                        textContent.match(/\d{1,2}:\d{2}(?::\d{2})?/g)?.forEach((item, index) => {
                            result.splice(index * 2 + 1, 0, h('podcast-time', item));
                        });

                        if (parent.children[index].type === 'element') {
                            const tagName = parent.children[index].tagName;
                            parent.children[index] = h(tagName === 'a' ? 'span' : tagName, result);
                        }
                    }
                }
            });
        }
        return tree;
    }, [content, audio?.podcast?.url]);

    return toJsxRuntime(tree, { Fragment, jsxs, jsx, components });
}

export default memo(Render);
