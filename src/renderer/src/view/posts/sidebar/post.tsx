import { useFeedStore, usePostStore } from '@/store';
import dayjs from 'dayjs';
import { memo, useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

import Avatar from '@/components/avatar';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from '@/components/ui/context-menu';
import { dayjsPlugin } from '@/lib/dayjs';
import { cn } from '@/lib/utils';

function Post({ id, className }: { id: number; className?: string }) {
    const post = usePostStore(useShallow(state => state.posts.find(p => p.id === id)));
    const isSelected = usePostStore(state => state.selectedPostId === post?.id);
    const updatePostReadById = usePostStore(state => state.updatePostReadById);
    const setSelectedPost = usePostStore(state => state.setSelectedPost);

    const setSelectFeed = useFeedStore(state => state.setSelectedFeedId);
    const feed = useFeedStore(state => state.feeds.find(f => f.id === post?.feedId));

    const openLink = () => window.open(post?.link, '_blank');

    if (!feed || !post) return null;
    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>
                <div
                    className={cn('flex p-4 select-none', { 'bg-sidebar-accent dark:bg-accent': isSelected, 'dark:hover:bg-accent/50 hover:bg-accent': !isSelected }, className)}
                    onClick={() => setSelectedPost(post.id)}
                    onDoubleClick={openLink}
                >
                    <div className={cn('right-anchor-left-1.5 h-anchor anchored/title flex items-center', { hidden: post.isRead })}>
                        <div className="size-1.5 rounded-full bg-orange-400"></div>
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <div className="anchor/title text-foreground mb-2 truncate font-bold" title={post.title}>
                            {post.title}
                        </div>
                        <p className="text-muted-foreground line-clamp-2 text-sm">{post.summary}</p>
                        <div className="text-muted-foreground mt-1 flex text-xs">
                            <div className="flex items-center gap-x-1 overflow-hidden">
                                <Avatar src={feed.icon ?? undefined} title={feed.title} />
                                <span className="truncate">{feed.title}</span>
                            </div>
                            <span className="mx-1">·</span>
                            <span className="flex-none" title={dayjs(post.pubDate).format('YYYY-MM-DD')}>
                                {dayjsPlugin(post.pubDate).fromNow()}
                            </span>
                        </div>
                    </div>
                    {post.imageUrl && <Image key={post.imageUrl} src={post.imageUrl} />}
                </div>
            </ContextMenuTrigger>
            <ContextMenuContent>
                <ContextMenuItem onSelect={() => post.id != null && updatePostReadById(post.id, !post.isRead)}>{post.isRead ? '标记为未读' : '标记为已读'}</ContextMenuItem>
                <ContextMenuItem onSelect={() => setSelectFeed(post.feedId)}>跳转至该订阅源</ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem onSelect={openLink}>在浏览器中打开文章</ContextMenuItem>
                <ContextMenuItem onSelect={() => navigator.clipboard.writeText(post.link ?? '')}>复制文章链接</ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    );
}

const MIN_IMAGE_SIZE = 10; // 过滤像素过小的占位图

const Image = memo(function Image({ src }: { src: string }) {
    const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'too-small'>('loading');

    useEffect(() => {
        const img = new window.Image();
        img.onload = () => {
            if (img.naturalWidth >= MIN_IMAGE_SIZE && img.naturalHeight >= MIN_IMAGE_SIZE) {
                setStatus('ready');
            } else {
                setStatus('too-small');
            }
        };
        img.onerror = () => setStatus('error');
        img.src = src;
        return () => {
            img.onload = null;
            img.onerror = null;
            img.src = '';
        };
    }, [src]);

    if (status !== 'ready') return null;

    return (
        <div className="ml-3 flex aspect-square w-1/3 flex-none items-center overflow-hidden">
            <img className="rounded-sm" alt="" src={src} />
        </div>
    );
});

export default memo(Post);
