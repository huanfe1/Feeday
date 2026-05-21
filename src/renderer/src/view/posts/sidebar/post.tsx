import { useStore } from '@/store';
import type { SidebarPost } from '@shared/types/ipc';
import dayjs from 'dayjs';
import { memo, useRef, useState } from 'react';

import Avatar from '@/components/avatar';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from '@/components/ui/context-menu';
import { fromNow } from '@/lib/dayjs';
import { eventBus } from '@/lib/events';
import { cn } from '@/lib/utils';

function Post({ post, className }: { post: SidebarPost; className?: string }) {
    const isSelected = useStore(state => state.postId === post.id);

    const { feed } = post;

    const handleClick = () => {
        useStore.getState().setPostId(post.id);
        if (!post.isRead) {
            eventBus.emit('mutate-post-read', { postId: post.id, isRead: true });
        }
    };

    const openLink = () => window.open(post.link, '_blank');
    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>
                <div
                    className={cn('flex p-4 select-none', { 'bg-sidebar-accent dark:bg-accent': isSelected, 'dark:hover:bg-accent/50 hover:bg-accent': !isSelected }, className)}
                    onClick={handleClick}
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
                                <Avatar defaultAvatarUrl={feed.icon ?? undefined} domain={feed.link} title={feed.title} />
                                <span className="truncate">{feed.title}</span>
                            </div>
                            <span className="mx-1">·</span>
                            <span className="flex-none" title={dayjs(post.pubDate).format('YYYY-MM-DD')}>
                                {post.pubDate && fromNow(post.pubDate)}
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
            <ContextMenuContent className="border-border/80 min-w-40 rounded-xl p-2 shadow-xl backdrop-blur-md">
                <ContextMenuItem className="rounded-md" onSelect={() => post.id != null && eventBus.emit('mutate-post-read', { postId: post.id, isRead: !post.isRead })}>
                    <i className={cn('text-muted-foreground size-4', post.isRead ? 'i-mingcute-mail-open-line' : 'i-mingcute-mail-line')} />
                    {post.isRead ? '标记为未读' : '标记为已读'}
                </ContextMenuItem>
                <ContextMenuItem className="rounded-md" onSelect={() => eventBus.emit('jump-to-feed', { feedId: post.feedId })}>
                    <i className="i-mingcute-send-plane-line text-muted-foreground size-4" />
                    跳转至该订阅源
                </ContextMenuItem>
                <ContextMenuSeparator className="my-2" />
                <ContextMenuItem className="rounded-md" onSelect={openLink}>
                    <i className="i-mingcute-external-link-line text-muted-foreground size-4" />
                    在浏览器中打开文章
                </ContextMenuItem>
                <ContextMenuItem className="rounded-md" onSelect={() => navigator.clipboard.writeText(post.link ?? '')}>
                    <i className="i-mingcute-copy-2-line text-muted-foreground size-4" />
                    复制文章链接
                </ContextMenuItem>
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
