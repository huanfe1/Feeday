import type { AudioTrack } from '@/store';
import { useAudioStore } from '@/store';
import { findAndReplace } from 'hast-util-find-and-replace';
import { toJsxRuntime } from 'hast-util-to-jsx-runtime';
import { h } from 'hastscript';
import { memo, useMemo } from 'react';
import { Fragment, jsx, jsxs } from 'react/jsx-runtime';

import parseHtml from '@/lib/parse-html';

type PodcastType = AudioTrack['podcast'] & { postId: number };

function PodcastTime({ podcast, ...props }: React.HTMLAttributes<HTMLSpanElement> & { podcast: PodcastType }) {
    const handleClickTime = (time: string) => {
        const postId = useAudioStore.getState().postId;
        const duration = useAudioStore.getState().duration;

        if (!podcast?.url || postId !== podcast.postId) return;

        const parts = time.split(':').map(Number);
        const seconds = parts.reduce((acc, cur) => acc * 60 + cur, 0);
        if (seconds > (podcast.duration ?? duration)) return;

        useAudioStore.getState().setCurrentTime(seconds);
    };
    const children = props.children as string;
    if (typeof children === 'string' && /^\d{1,2}:\d{2}(?::\d{2})?$/.test(children)) {
        return (
            <span className="cursor-pointer font-semibold text-blue-500 hover:underline" onClick={() => handleClickTime(children)}>
                {children}
            </span>
        );
    }
    return <span>{children}</span>;
}

function Render({ content, podcast }: { content: string; podcast: PodcastType }) {
    const components = {
        a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
            <a href={props.href} target="_blank" rel="noopener noreferrer">
                {props.children}
            </a>
        ),
        h1: (props: React.HTMLAttributes<HTMLHeadingElement>) => <h2 {...props} />,
        img: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} loading="lazy" />,
        'podcast-time': (props: React.HTMLAttributes<HTMLSpanElement>) => <PodcastTime {...props} podcast={podcast} />,
    };

    const tree = useMemo(() => {
        const tree = parseHtml(content);
        if (podcast.url) {
            findAndReplace(tree, [[/\d{1,2}:\d{2}(?::\d{2})?/g, $0 => h('podcast-time', $0)]], {
                ignore: node => node.type === 'element' && node.tagName === 'podcast-time',
            });
        }
        return tree;
    }, [content, podcast.url]);

    return toJsxRuntime(tree, { Fragment, jsxs, jsx, components });
}

export default memo(Render);
