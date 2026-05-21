import { useStore } from '@/store';
import type { DbGetPostsParams, DbGetPostsResult } from '@shared/types/ipc';
import { useVirtualizer } from '@tanstack/react-virtual';
import { AnimatePresence, motion } from 'motion/react';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useSWRInfinite from 'swr/infinite';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { eventBus } from '@/lib/events';
import { cn, enterVariants } from '@/lib/utils';

import Render from './render';

const PAGE_SIZE = 20;

const fetcher = ([_channel, params]: ['db-get-posts', DbGetPostsParams]): Promise<DbGetPostsResult> => {
    return window.electron.ipcRenderer.invoke('db-get-posts', params);
};

function Main() {
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

    const mediaIds = useMemo(() => posts.map(p => p.id), [posts]);

    const viewportRef = useRef<HTMLDivElement>(null);
    const loadMoreSentinelRef = useRef<HTMLDivElement>(null);
    const [columnsPerRow, setColumnsPerRow] = useState(3);

    useEffect(() => {
        const target = viewportRef.current;
        if (!target) return;

        const resizeObserver = new ResizeObserver(entries => {
            const width = entries[0].contentRect.width;
            if (width === 0) return;

            let newColumns = 3;
            if (width >= 1280) newColumns = 4;
            else if (width < 900) newColumns = 2;

            setColumnsPerRow(prev => (prev === newColumns ? prev : newColumns));
        });

        resizeObserver.observe(target);
        return () => resizeObserver.disconnect();
    }, []);

    const rows = useMemo(() => {
        const result: (typeof mediaIds)[] = [];
        for (let i = 0; i < mediaIds.length; i += columnsPerRow) {
            result.push(mediaIds.slice(i, i + columnsPerRow));
        }
        return result;
    }, [mediaIds, columnsPerRow]);

    const estimateRowHeight = useCallback(() => {
        const targetElement = viewportRef.current;
        if (!targetElement) return 240;
        const containerWidth = targetElement.offsetWidth || 1000;
        const padding = 32;
        const gap = 8;
        const itemWidth = (containerWidth - padding - gap * (columnsPerRow - 1)) / columnsPerRow;
        const imageHeight = itemWidth * (9 / 16);
        const textHeight = 48;
        const paddingHeight = 16;
        return imageHeight + textHeight + paddingHeight + gap;
    }, [columnsPerRow]);

    // eslint-disable-next-line react-hooks/incompatible-library
    const virtualizer = useVirtualizer({
        count: rows.length,
        getScrollElement: () => viewportRef.current,
        estimateSize: estimateRowHeight,
        overscan: 2,
    });

    useEffect(() => virtualizer.scrollToIndex(0), [feedKey, onlyUnread, virtualizer]);

    useEffect(() => {
        const sentinel = loadMoreSentinelRef.current;
        const root = viewportRef.current;
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

    useEffect(() => {
        return eventBus.on('mutate-post-read', ({ postId, isRead }) => {
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

    const toggleOnlyUnread = () => setOnlyUnread(prev => !prev);

    const postMap = useMemo(() => new Map(posts.map(p => [p.id, p])), [posts]);

    if (mediaIds.length === 0) return null;

    return (
        <div className="flex h-full w-full flex-col overflow-hidden">
            <div className="flex h-15 items-center justify-between gap-4 px-4">
                <h3 className="truncate text-lg font-bold">{title || '媒体列表'}</h3>
                <Buttons handleReadAllPosts={handleReadAllPosts} mutate={handleRefresh} onlyUnread={onlyUnread} toggleOnlyUnread={toggleOnlyUnread} />
            </div>
            <ScrollArea className="h-full min-h-0" viewportRef={viewportRef}>
                <AnimatePresence mode="wait">
                    <motion.div className="h-full" key={`${feedKey}-${onlyUnread}`} {...enterVariants}>
                        <div className="relative mb-3 w-full" style={{ height: `${virtualizer.getTotalSize()}px` }}>
                            {virtualizer.getVirtualItems().map(virtualRow => {
                                const rowItems = rows[virtualRow.index];
                                return (
                                    <div
                                        className="absolute top-0 left-0 w-full"
                                        data-index={virtualRow.index}
                                        key={virtualRow.index}
                                        ref={virtualizer.measureElement}
                                        style={{ transform: `translateY(${virtualRow.start}px)` }}
                                    >
                                        <div className="grid gap-2 px-4 pt-2" style={{ gridTemplateColumns: `repeat(${columnsPerRow}, minmax(0, 1fr))` }}>
                                            {rowItems.map(id => {
                                                const post = postMap.get(id);
                                                return post ? <Render key={id} post={post} /> : null;
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        {canLoadMore ? (
                            <div className="text-muted-foreground flex min-h-10 items-center justify-center py-2 text-xs select-none" ref={loadMoreSentinelRef}>
                                {isValidating ? '加载中…' : ''}
                            </div>
                        ) : null}
                    </motion.div>
                </AnimatePresence>
            </ScrollArea>
        </div>
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
                    <Button onClick={mutate} size="icon" variant="ghost">
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
                    <p>{onlyUnread ? '显示全部' : '只显示未读'}</p>
                </TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button onClick={handleReadAllPosts} size="icon" variant="ghost">
                        <i className="i-mingcute-check-circle-line text-xl opacity-75" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>全部标为已读</p>
                </TooltipContent>
            </Tooltip>
        </span>
    );
});

export default memo(Main);
