import type { PostType } from '@/store';
import { useFeedStore, usePostStore } from '@/store';
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
import { useShallow } from 'zustand/react/shallow';

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

const parser = unified().use(rehypeParse, { fragment: true });

const fetcher = ([_channel, postId]) => window.electron.ipcRenderer.invoke('db-get-post-by-id', postId);

const displayComponents = {
    video: VideoPreview,
    img: Image,
};

const Display = memo(function Display({ media, content }: { media: PostType; content: string }) {
    return useMemo(() => {
        if (media.link.startsWith('https://www.youtube.com/watch?v=') && media.imageUrl) {
            const imgUrl = media.imageUrl.replace(new URL(media.imageUrl).search, '');
            return <img className="w-full" alt={media.title} loading="lazy" src={imgUrl} />;
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

        if (newTree.children.length === 0 && media.imageUrl) {
            return <Image alt={media.title} loading="lazy" src={media.imageUrl} />;
        }

        return toJsxRuntime(newTree, { Fragment, jsxs, jsx, components: displayComponents });
    }, [content, media.imageUrl, media.link, media.title]);
});

function Render({ id }: { id: number }) {
    const media = usePostStore(useShallow(state => state.posts.find(p => p.id === id)));
    const feed = useFeedStore(state => state.feeds.find(f => f.id === media?.feedId));
    const updatePostReadById = usePostStore(state => state.updatePostReadById);
    const { data: postDetail } = useSWR<PostDetail | null>(['db-get-post-by-id', id], fetcher);
    const content = postDetail?.content ?? '';

    if (!feed || !media) return null;
    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>
                <div
                    className="hover:bg-accent relative rounded p-2 select-none"
                    key={media.id}
                    onClick={() => media.id != null && updatePostReadById(media.id, true)}
                    onDoubleClick={() => window.open(media.link, '_blank')}
                >
                    <div className="bg-muted flex aspect-video items-center overflow-hidden rounded">
                        <Display content={content} media={media} />
                    </div>
                    <div className="text-foreground mt-2 truncate text-sm font-medium">{media.title ?? ''}</div>
                    <div className="text-muted-foreground mt-1 flex text-xs">
                        <Avatar defaultAvatarUrl={feed.icon ?? undefined} domain={feed.link ?? ''} title={feed.memo ?? feed.title ?? ''} />
                        <span className="ml-1 truncate">{feed.memo ?? feed.title ?? ''}</span>
                        <span className="ml-3 flex-none">{dayjs(media.pubDate).format('YYYY-MM-DD')}</span>
                    </div>
                    <span className={cn('absolute -top-0.5 -left-0.5 size-2 rounded-full bg-orange-400', { hidden: media.isRead })}></span>
                </div>
            </ContextMenuTrigger>
            <ContextMenuContent className="border-border/80 min-w-40 rounded-xl p-2 shadow-xl backdrop-blur-md">
                <ContextMenuItem className="rounded-md" onSelect={() => media.id != null && updatePostReadById(media.id, !media.isRead)}>
                    <i className={cn('text-muted-foreground size-4', media.isRead ? 'i-mingcute-mail-open-line' : 'i-mingcute-mail-line')} />
                    {media.isRead ? '标记为未读' : '标记为已读'}
                </ContextMenuItem>
                {/* <ContextMenuItem onSelect={() => setSelectFeed(post.feedId)}>跳转至该订阅源</ContextMenuItem> */}
                <ContextMenuSeparator className="my-2" />
                <ContextMenuItem className="rounded-md" onSelect={() => window.open(media.link, '_blank')}>
                    <i className="i-mingcute-external-link-line text-muted-foreground size-4" />
                    在浏览器中打开
                </ContextMenuItem>
                {/* <ContextMenuItem onSelect={() => navigator.clipboard.writeText(post.link)}>复制文章链接</ContextMenuItem> */}
            </ContextMenuContent>
        </ContextMenu>
    );
}

export default memo(Render);
