/* eslint-disable react/prop-types */
import type { SidebarPost } from '@shared/types/ipc';
import type { PostDetail } from '@shared/types/database';
import dayjs from 'dayjs';
import type { Root } from 'hast';
import { toJsxRuntime } from 'hast-util-to-jsx-runtime';
import { memo, useMemo, useRef, useState } from 'react';
import { Fragment, jsx, jsxs } from 'react/jsx-runtime';
import rehypeParse from 'rehype-parse';
import useSWR from 'swr';
import { unified } from 'unified';
import { EXIT, visit } from 'unist-util-visit';

import Avatar from '@/components/avatar';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from '@/components/ui/context-menu';
import { fromNow } from '@/lib/dayjs';
import { eventBus } from '@/lib/events';
import { cn } from '@/lib/utils';

const Image = memo(function Image(props: React.ComponentProps<'img'>) {
    const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
        e.currentTarget.style.display = 'none';
    };
    return <img className={cn('w-full', props.className)} alt={props.alt} loading="lazy" onError={handleError} src={props.src} />;
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

const parser = unified().use(rehypeParse, { fragment: true });

const fetcher = ([_channel, postId]: readonly [string, number]) => window.electron.ipcRenderer.invoke('db-get-post-by-id', postId);

const displayComponents = {
    video: VideoPreview,
    img: Image,
};

const Display = memo(function Display({ post, content }: { post: SidebarPost; content: string }) {
    return useMemo(() => {
        if (post.link.startsWith('https://www.youtube.com/watch?v=') && post.imageUrl) {
            const imgUrl = post.imageUrl.replace(new URL(post.imageUrl).search, '');
            return <img className="w-full" alt={post.title ?? ''} loading="lazy" src={imgUrl} />;
        }
        const tree = parser.parse(content);
        const newTree: Root = { type: 'root', children: [] };
        visit(tree, 'element', node => {
            if (node.tagName === 'img' || node.tagName === 'video') {
                newTree.children.push(node);
                return EXIT;
            }
            return;
        });

        if (newTree.children.length === 0 && post.imageUrl) {
            return <Image alt={post.title ?? ''} loading="lazy" src={post.imageUrl} />;
        }

        return toJsxRuntime(newTree, { Fragment, jsxs, jsx, components: displayComponents });
    }, [content, post.imageUrl, post.link, post.title]);
});

function Render({ post }: { post: SidebarPost }) {
    const { feed } = post;
    const { data: postDetail } = useSWR<PostDetail | null>(['db-get-post-by-id', post.id], fetcher);
    const content = postDetail?.content ?? '';

    const handleClick = () => {
        if (!post.isRead) {
            eventBus.emit('mutate-post-read', { postId: post.id, isRead: true });
        }
    };

    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>
                <div
                    className="hover:bg-accent relative rounded p-2 select-none"
                    onClick={handleClick}
                    onDoubleClick={() => window.open(post.link, '_blank')}
                >
                    <div className="bg-muted flex aspect-video items-center overflow-hidden rounded">
                        <Display content={content} post={post} />
                    </div>
                    <div className="text-foreground mt-2 truncate text-sm font-medium">{post.title ?? ''}</div>
                    <div className="text-muted-foreground mt-1 flex text-xs">
                        <Avatar defaultAvatarUrl={feed.icon ?? undefined} domain={feed.link ?? ''} title={feed.title ?? ''} />
                        <span className="ml-1 truncate">{feed.title ?? ''}</span>
                        <span className="ml-3 flex-none" title={post.pubDate ? dayjs(post.pubDate).format('YYYY-MM-DD HH:mm:ss') : undefined}>
                            {post.pubDate && fromNow(post.pubDate)}
                        </span>
                    </div>
                    <span className={cn('absolute -top-0.5 -left-0.5 size-2 rounded-full bg-orange-400', { hidden: post.isRead })}></span>
                </div>
            </ContextMenuTrigger>
            <ContextMenuContent className="border-border/80 min-w-40 rounded-xl p-2 shadow-xl backdrop-blur-md">
                <ContextMenuItem className="rounded-md" onSelect={() => eventBus.emit('mutate-post-read', { postId: post.id, isRead: !post.isRead })}>
                    <i className={cn('text-muted-foreground size-4', post.isRead ? 'i-mingcute-mail-open-line' : 'i-mingcute-mail-line')} />
                    {post.isRead ? '标记为未读' : '标记为已读'}
                </ContextMenuItem>
                <ContextMenuItem className="rounded-md" onSelect={() => eventBus.emit('jump-to-feed', { feedId: post.feedId })}>
                    <i className="i-mingcute-send-plane-line text-muted-foreground size-4" />
                    跳转至该订阅源
                </ContextMenuItem>
                <ContextMenuSeparator className="my-2" />
                <ContextMenuItem className="rounded-md" onSelect={() => window.open(post.link, '_blank')}>
                    <i className="i-mingcute-external-link-line text-muted-foreground size-4" />
                    在浏览器中打开
                </ContextMenuItem>
                <ContextMenuItem className="rounded-md" onSelect={() => navigator.clipboard.writeText(post.link ?? '')}>
                    <i className="i-mingcute-copy-2-line text-muted-foreground size-4" />
                    复制链接
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    );
}

export default memo(Render);
