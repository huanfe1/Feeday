import { useStore } from '@/store';
import type { DbGetPostsParams, DbGetPostsResult } from '@shared/types/ipc';
import { useVirtualizer } from '@tanstack/react-virtual';
import { AnimatePresence, motion } from 'motion/react';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import useSWRInfinite from 'swr/infinite';

import Resizable from '@/components/resizable';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { eventBus } from '@/lib/events';
import { cn, enterVariants } from '@/lib/utils';

import Post from './post';

const PAGE_SIZE = 20;

const fetcher = ([_channel, params]: ['db-get-posts', DbGetPostsParams]): Promise<DbGetPostsResult> => {
    return window.electron.ipcRenderer.invoke('db-get-posts', params);
};

export default function Sidebar() {
    const feedKey = useStore(store => store.feedKey);
    const [onlyUnread, setOnlyUnread] = useState(false);

    const {
        data: pages,
        setSize,
        mutate,
        isValidating,
    } = useSWRInfinite<DbGetPostsResult>((pageIndex, previousPageData) => {
        if (previousPageData && !previousPageData.hasMore) return null;
        return ['db-get-posts', { feedKey, onlyUnread, offset: pageIndex * PAGE_SIZE, limit: PAGE_SIZE }];
    }, fetcher);

    useEffect(() => void setSize(1), [feedKey, onlyUnread, setSize]);

    const posts = useMemo(() => pages?.flatMap(p => p.posts) ?? [], [pages]);
    const canLoadMore = pages?.[pages.length - 1]?.hasMore ?? false;
    const title = pages?.[0]?.title;

    const postIds = useMemo(() => posts?.map(post => post.id) ?? [], [posts]);
    const parentRef = useRef<HTMLDivElement>(null);
    const loadMoreSentinelRef = useRef<HTMLDivElement>(null);
    // eslint-disable-next-line react-hooks/incompatible-library
    const virtualizer = useVirtualizer({
        count: postIds.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 125,
        overscan: 3,
    });

    useEffect(() => {
        const sentinel = loadMoreSentinelRef.current;
        const root = parentRef.current;
        if (!sentinel || !root || !canLoadMore) return;

        const io = new IntersectionObserver(
            entries => {
                if (entries[0]?.isIntersecting && !isValidating) {
                    void setSize(s => s + 1);
                }
            },
            { root, rootMargin: '160px', threshold: 0 },
        );
        io.observe(sentinel);
        return () => io.disconnect();
    }, [canLoadMore, isValidating, setSize]);

    const toggleOnlyUnread = () => {
        setOnlyUnread(prev => !prev);
    };

    useEffect(() => virtualizer.scrollToIndex(0), [feedKey, onlyUnread, virtualizer]);

    const handleReadAllPosts = () => {
        void window.electron.ipcRenderer.invoke('db-read-all-posts', feedKey).then(() => {
            mutate(
                pages => {
                    if (!pages) return pages;
                    return pages.map(page => ({
                        ...page,
                        posts: page.posts.map(p => ({ ...p, isRead: true })),
                    }));
                },
                { revalidate: false },
            );
            eventBus.emit('read-all-posts', null);
            eventBus.emit('refresh-feeds', null);
        });
    };

    const handleRefresh = () => {
        mutate();
        eventBus.emit('refresh-feeds', null);
    };

    useEffect(() => {
        eventBus.on('mutate-post-read', ({ postId, isRead }) => {
            mutate(
                pages => {
                    if (!pages) return pages;
                    return pages.map(page => ({
                        ...page,
                        posts: page.posts.map(p => (p.id === postId ? { ...p, isRead } : p)),
                    }));
                },
                { revalidate: false },
            );

            window.electron.ipcRenderer.invoke('db-update-post-read-by-id', postId, isRead).then(() => {
                eventBus.emit('refresh-feeds', null);
            });
        });
    }, [mutate]);

    useEffect(() => {
        eventBus.on('refresh-posts', () => mutate());
    }, [mutate]);

    return (
        <Resizable id="posts-sidebar" options={{ axis: 'x', min: 300, max: 400, initial: 300 }}>
            <div className="flex h-full w-full flex-col overflow-y-hidden">
                <div className="drag-region mx-4 flex h-15 items-center justify-between gap-4">
                    <motion.h3 className="truncate text-lg font-bold">{title || '文章列表'}</motion.h3>
                    <Buttons handleReadAllPosts={handleReadAllPosts} mutate={handleRefresh} onlyUnread={onlyUnread} toggleOnlyUnread={toggleOnlyUnread} />
                </div>
                <ScrollArea className="min-h-0 flex-1" viewportRef={parentRef}>
                    <AnimatePresence mode="wait">
                        <motion.div className="w-full overflow-y-hidden" {...enterVariants} key={`${feedKey}-${onlyUnread}`}>
                            {posts?.length === 0 ? (
                                pages === undefined ? (
                                    <div className="text-muted-foreground flex h-[calc(100vh-60px)] items-center justify-center select-none">
                                        <span className="text-sm">加载中…</span>
                                    </div>
                                ) : (
                                    <div className="text-muted-foreground flex h-[calc(100vh-60px)] items-center justify-center select-none">
                                        <div className="flex flex-col items-center gap-y-3">
                                            <i className="i-mingcute-celebrate-line text-3xl"></i>
                                            <span>全部已读</span>
                                        </div>
                                    </div>
                                )
                            ) : (
                                <div
                                    style={{
                                        height: `${virtualizer.getTotalSize()}px`,
                                        width: '100%',
                                        position: 'relative',
                                    }}
                                >
                                    {virtualizer.getVirtualItems().map(virtualItem => {
                                        const post = posts[virtualItem.index];
                                        return (
                                            <div
                                                data-index={virtualItem.index}
                                                key={post.id}
                                                ref={virtualizer.measureElement}
                                                style={{
                                                    position: 'absolute',
                                                    top: 0,
                                                    left: 0,
                                                    width: '100%',
                                                    transform: `translateY(${virtualItem.start}px)`,
                                                    willChange: 'transform',
                                                }}
                                            >
                                                <Post key={post.id} post={post} />
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            {canLoadMore ? (
                                <div className="text-muted-foreground flex min-h-10 items-center justify-center py-2 text-xs select-none" ref={loadMoreSentinelRef}>
                                    {isValidating ? '加载中…' : ''}
                                </div>
                            ) : null}
                        </motion.div>
                    </AnimatePresence>
                </ScrollArea>
            </div>
        </Resizable>
    );
}

const Buttons = memo(function Buttons({
    mutate,
    onlyUnread,
    toggleOnlyUnread,
    handleReadAllPosts,
}: {
    mutate: () => void;
    onlyUnread: boolean;
    toggleOnlyUnread: () => void;
    handleReadAllPosts: () => void;
}) {
    return (
        <span className={cn('text-muted-foreground flex-none space-x-1 text-xl')}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button className="" onClick={mutate} size="icon" variant="ghost">
                        <i className="i-mingcute-refresh-2-line text-xl opacity-75" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>刷新</p>
                </TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button onClick={toggleOnlyUnread} size="icon" variant="ghost">
                        <i className={cn('text-xl opacity-75', onlyUnread ? 'i-mingcute-round-fill' : 'i-mingcute-round-line')}></i>
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{onlyUnread ? '显示全部' : '只显示已读'}</p>
                </TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button onClick={handleReadAllPosts} size="icon" variant="ghost">
                        <i className="i-mingcute-check-circle-line text-xl opacity-75"></i>
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>全部标为已读</p>
                </TooltipContent>
            </Tooltip>
        </span>
    );
});
