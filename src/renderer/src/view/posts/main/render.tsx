import type { AudioTrack } from '@/store';
import { useAudioStore } from '@/store';
import { toJsxRuntime } from 'hast-util-to-jsx-runtime';
import { memo, useMemo } from 'react';
import { Fragment, jsx, jsxs } from 'react/jsx-runtime';
import rehypeParse from 'rehype-parse';
import rehypeSanitize from 'rehype-sanitize';
import { unified } from 'unified';

type PodcastType = AudioTrack['podcast'] & { postId: number };

const Link = memo(function Link({ podcast, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { podcast: PodcastType }) {
    const handleClickTime = (time: string) => {
        const postId = useAudioStore.getState().postId;
        const duration = useAudioStore.getState().duration;

        if (!podcast?.url || postId !== podcast.postId) return;

        const timeArr = time.split(':').map(Number);
        let seconds = 0;
        const timeMap = [1, 60, 3600];
        timeArr.forEach((item, index) => {
            seconds += item * timeMap[timeArr.length - index - 1];
        });
        if (seconds > (podcast.duration ?? duration)) return;

        useAudioStore.getState().setCurrentTime(seconds);
    };

    const children = props.children;
    if (typeof children === 'string' && /^\d{1,2}:\d{2}(?::\d{2})?$/.test(children)) {
        return (
            <span className="cursor-pointer font-semibold text-blue-500 hover:underline" onClick={() => handleClickTime(children as unknown as string)}>
                {children}
            </span>
        );
    }
    return (
        <a className="no-underline hover:underline" href={props.href} target="_blank" rel="noopener noreferrer">
            {children}
        </a>
    );
});

function Render({ content, podcast }: { content: string; podcast: PodcastType }) {
    const components = {
        a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <Link {...props} podcast={podcast} />,
        h1: (props: React.HTMLAttributes<HTMLHeadingElement>) => <h2 {...props} />,
        img: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} loading="lazy" />,
    };

    const tree = useMemo(() => unified().use(rehypeParse, { fragment: true }).use(rehypeSanitize).parse(content), [content]);
    const jsxRuntime = toJsxRuntime(tree, { Fragment, jsxs, jsx, components });

    return jsxRuntime;
}

export default memo(Render);
