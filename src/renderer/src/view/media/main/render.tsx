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

const Image = memo(function Image(props: React.ImgHTMLAttributes<HTMLImageElement>) {
    const ErrorHandle = (e: React.SyntheticEvent<HTMLImageElement>) => {
        e.currentTarget.style.display = 'none';
    };
    return <img className={cn('w-full', props.className)} src={props.src} alt={props.alt} onError={ErrorHandle} />;
});

const VideoPreview = memo(function VideoPreview({ ...props }: React.VideoHTMLAttributes<HTMLVideoElement>) {
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
            <video className="absolute w-full" {...props} controls={false} ref={videoRef} loop muted />
            <Image className={cn('absolute min-h-full transition-opacity', { 'opacity-0': isHover })} src={props.poster} alt={props.title} loading="lazy" />
        </div>
    );
});

const components = {
    video: VideoPreview,
    img: Image,
};

const Display = memo(function Display({ media }: { media: PostType }) {
    if (media.link.startsWith('https://www.youtube.com/watch?v=')) {
        const imgUrl = media.image_url.replace(new URL(media.image_url).search, '');
        return <img className="w-full" src={imgUrl} alt={media.title} loading="lazy" />;
    }
    const tree = unified().use(rehypeParse, { fragment: true }).parse(media.summary);

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
    const feed = useFeedStore(state => state.feeds.find(f => f.id === media.feed_id));
    const updatePostReadById = usePostStore(state => state.setPostReadById);

    if (!feed) return null;
    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>
                <div
                    className="relative rounded p-2 select-none hover:bg-gray-200"
                    onClick={() => updatePostReadById(media.id, true)}
                    key={media.id}
                    onDoubleClick={() => window.open(media.link, '_blank')}
                >
                    <div className="flex aspect-video items-center overflow-hidden rounded bg-gray-100">
                        <Display media={media} />
                    </div>
                    <div className="mt-2 truncate text-sm font-medium text-gray-600">{media.title}</div>
                    <div className="mt-1 flex text-xs text-gray-600">
                        <Avatar title={feed.title} src={feed.icon} />
                        <span className="ml-1 truncate">{feed.title}</span>
                        <span className="ml-3 flex-none text-gray-400">{dayjs(media.pub_date).format('YYYY-MM-DD')}</span>
                    </div>
                    <span className={cn('absolute -top-0.5 -left-0.5 size-2 rounded-full bg-orange-400', { hidden: media.is_read })}></span>
                </div>
            </ContextMenuTrigger>
            <ContextMenuContent>
                <ContextMenuItem onSelect={() => updatePostReadById(media.id, !media.is_read)}>{media.is_read ? '标记为未读' : '标记为已读'}</ContextMenuItem>
                {/* <ContextMenuItem onSelect={() => setSelectFeed(post.feed_id)}>跳转至该订阅源</ContextMenuItem> */}
                <ContextMenuSeparator />
                <ContextMenuItem onSelect={() => window.open(media.link, '_blank')}>在浏览器中打开</ContextMenuItem>
                {/* <ContextMenuItem onSelect={() => navigator.clipboard.writeText(post.link)}>复制文章链接</ContextMenuItem> */}
            </ContextMenuContent>
        </ContextMenu>
    );
}

export default memo(Render);
