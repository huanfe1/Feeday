import { useFeedStore, usePostStore } from '@/store';
import dayjs from 'dayjs';
import { memo, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

import Avatar from '@/components/avatar';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from '@/components/ui/context-menu';
import { dayjsPlugin } from '@/lib/dayjs';
import { eventBus } from '@/lib/events';
import { cn } from '@/lib/utils';

function Post({ id, className }: { id: number; className?: string }) {
    const post = usePostStore(useShallow(state => state.posts.find(p => p.id === id)));
    const isSelected = usePostStore(state => state.selectedPostId === post?.id);
    const updatePostReadById = usePostStore(state => state.updatePostReadById);
    const setSelectedPost = usePostStore(state => state.setSelectedPost);

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
                                <Avatar defaultAvatarUrl={feed.icon ?? undefined} domain={feed.link ?? ''} title={feed.memo ?? feed.title ?? ''} />
                                <span className="truncate">{feed.memo ?? feed.title ?? ''}</span>
                            </div>
                            <span className="mx-1">·</span>
                            <span className="flex-none" title={dayjs(post.pubDate).format('YYYY-MM-DD')}>
                                {dayjsPlugin(post.pubDate).fromNow()}
                            </span>
                        </div>
                    </div>
                    {post.imageUrl && <Image key={post.imageUrl} src={post.imageUrl} />}
                    {/* {post.imageUrl && (
                        <div className="bg-muted/75 ml-3 flex aspect-square w-1/3 flex-none items-center overflow-hidden rounded-sm">
                            <img className="rounded-sm" alt="" src={post.imageUrl} />
                        </div>
                    )} */}
                </div>
            </ContextMenuTrigger>
            <ContextMenuContent>
                <ContextMenuItem onSelect={() => post.id != null && updatePostReadById(post.id, !post.isRead)}>{post.isRead ? '标记为未读' : '标记为已读'}</ContextMenuItem>
                <ContextMenuItem onSelect={() => eventBus.emit('jump-to-feed', { feedId: post.feedId })}>跳转至该订阅源</ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem onSelect={openLink}>在浏览器中打开文章</ContextMenuItem>
                <ContextMenuItem onSelect={() => navigator.clipboard.writeText(post.link ?? '')}>复制文章链接</ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    );
}

const MIN_IMAGE_SIZE = 100; // 过滤像素过小的占位图
const errorImages = new Set<string>(); // 临时存储需要隐藏的图片，避免重复加载

const Image = memo(function Image({ src }: { src: string }) {
    const imageRef = useRef<HTMLImageElement>(null);
    const [isHidden, setIsHidden] = useState(false);

    if (errorImages.has(src)) {
        return null;
    }

    const handleLoad = () => {
        if (!imageRef?.current) return;
        if (imageRef.current.naturalWidth < MIN_IMAGE_SIZE && imageRef.current.naturalHeight < MIN_IMAGE_SIZE) {
            setIsHidden(true);
            errorImages.add(src);
        }
    };

    const handleError = () => {
        setIsHidden(true);
        errorImages.add(src);
    };

    return (
        <div className={cn('bg-sidebar ml-3 flex aspect-square w-1/3 flex-none items-center overflow-hidden rounded-sm', { hidden: isHidden })}>
            <img className="rounded-sm" alt="" loading="lazy" onError={handleError} onLoad={handleLoad} ref={imageRef} src={src} />
        </div>
    );
});

export default memo(Post);
