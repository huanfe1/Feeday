import type { PostType } from '@/store';
import { useFeedStore, usePostStore } from '@/store';
import dayjs from 'dayjs';
import type { Root } from 'hast';
import { toJsxRuntime } from 'hast-util-to-jsx-runtime';
import { memo, useRef, useState } from 'react';
import { Fragment, jsx, jsxs } from 'react/jsx-runtime';
import rehypeParse from 'rehype-parse';
import { unified } from 'unified';
import { EXIT, visit } from 'unist-util-visit';

import Avatar from '@/components/avatar';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from '@/components/ui/context-menu';
import { cn } from '@/lib/utils';

const Image = memo(function Image(props: React.ComponentProps<'img'>) {
    const ErrorHandle = (e: React.SyntheticEvent<HTMLImageElement>) => {
        e.currentTarget.style.display = 'none';
    };
    return <img className={cn('w-full', props.className)} alt={props.alt} onError={ErrorHandle} src={props.src} />;
});

const VideoPreview = memo(function VideoPreview({ ...props }: React.ComponentProps<'video'>) {
    const [isHover, setIsHover] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    const handleMouseEnter = () => {
        setIsHover(true);
        videoRef.current?.play();
    };
    const handleMouseLeave = () => {
        setIsHover(false);
        videoRef.current?.pause();
    };

    return (
        <div className="relative flex h-full w-full items-center justify-center" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
            <video className="absolute w-full" {...props} controls={false} loop muted ref={videoRef} />
            <Image className={cn('absolute min-h-full transition-opacity', { 'opacity-0': isHover })} alt={props.title} loading="lazy" src={props.poster} />
        </div>
    );
});

const components = {
    video: VideoPreview,
    img: Image,
};

const parser = unified().use(rehypeParse, { fragment: true });

const Display = memo(function Display({ media }: { media: PostType }) {
    if (media.link.startsWith('https://www.youtube.com/watch?v=')) {
        const imgUrl = media.imageUrl.replace(new URL(media.imageUrl).search, '');
        return <img className="w-full" alt={media.title} loading="lazy" src={imgUrl} />;
    }
    const tree = parser.parse(media.summary);

    const newTree: Root = { type: 'root', children: [] };
    visit(tree, 'element', node => {
        if (node.tagName === 'img' || node.tagName === 'video') {
            newTree.children.push(node);
            return EXIT;
        }
        return;
    });
    return toJsxRuntime(newTree, { Fragment, jsxs, jsx, components });
});

function Render({ media }: { media: PostType }) {
    const feed = useFeedStore(state => state.feeds.find(f => f.id === media.feedId));
    const updatePostReadById = usePostStore(state => state.updatePostReadById);

    if (!feed) return null;
    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>
                <div
                    className="relative rounded p-2 select-none hover:bg-gray-200"
                    key={media.id}
                    onClick={() => updatePostReadById(media.id, true)}
                    onDoubleClick={() => window.open(media.link, '_blank')}
                >
                    <div className="flex aspect-video items-center overflow-hidden rounded bg-gray-100">
                        <Display media={media} />
                    </div>
                    <div className="mt-2 truncate text-sm font-medium text-gray-600">{media.title}</div>
                    <div className="mt-1 flex text-xs text-gray-600">
                        <Avatar src={feed.icon} title={feed.title} />
                        <span className="ml-1 truncate">{feed.title}</span>
                        <span className="ml-3 flex-none text-gray-400">{dayjs(media.pubDate).format('YYYY-MM-DD')}</span>
                    </div>
                    <span className={cn('absolute -top-0.5 -left-0.5 size-2 rounded-full bg-orange-400', { hidden: media.isRead })}></span>
                </div>
            </ContextMenuTrigger>
            <ContextMenuContent>
                <ContextMenuItem onSelect={() => updatePostReadById(media.id, !media.isRead)}>{media.isRead ? '标记为未读' : '标记为已读'}</ContextMenuItem>
                {/* <ContextMenuItem onSelect={() => setSelectFeed(post.feedId)}>跳转至该订阅源</ContextMenuItem> */}
                <ContextMenuSeparator />
                <ContextMenuItem onSelect={() => window.open(media.link, '_blank')}>在浏览器中打开</ContextMenuItem>
                {/* <ContextMenuItem onSelect={() => navigator.clipboard.writeText(post.link)}>复制文章链接</ContextMenuItem> */}
            </ContextMenuContent>
        </ContextMenu>
    );
}

export default memo(Render);
