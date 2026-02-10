import { useFeedStore, useFolderStore, usePostStore } from '@/store';
import { useVirtualizer } from '@tanstack/react-virtual';
import { AnimatePresence, motion } from 'motion/react';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn, enterVariants } from '@/lib/utils';

import Render from './render';

function Main() {
    const mediaIds = usePostStore(useShallow(state => state.posts.map(p => p.id)));
    const onlyUnread = usePostStore(state => state.onlyUnread);

    const selectedFeedId = useFeedStore(state => state.selectedFeedId);
    const selectedFeedTitle = useFeedStore(state => state.getSelectedFeed()?.title);
    const selectedFolderId = useFolderStore(state => state.selectedFolderId);
    const selectedFolderName = useFolderStore(state => state.getSelectedFolder()?.name);

    const viewportRef = useRef<HTMLDivElement>(null);
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

            setColumnsPerRow(newColumns);
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

    useEffect(() => virtualizer.scrollToIndex(0), [mediaIds, virtualizer]);

    if (mediaIds.length === 0) return null;
    return (
        <div className="flex h-full w-full flex-col overflow-hidden">
            <div className="flex h-15 items-center justify-between gap-4 px-4">
                <h3 className="truncate text-lg font-bold">{selectedFolderName || selectedFeedTitle || '媒体列表'}</h3>
                <Buttons />
            </div>
            <ScrollArea className="h-full min-h-0" viewportRef={viewportRef}>
                <AnimatePresence mode="wait">
                    <motion.div className="h-full" key={[onlyUnread, selectedFeedId, selectedFolderId].join('-')} {...enterVariants}>
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
                                            {rowItems.map(id => (
                                                <Render id={id} key={id} />
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div></div>
                    </motion.div>
                </AnimatePresence>
            </ScrollArea>
        </div>
    );
}

const Buttons = memo(function Buttons({ className }: { className?: string }) {
    const refreshHandle = () => {
        useFeedStore.getState().refreshFeeds();
        usePostStore.getState().refreshPosts();
    };

    const selectedFeedId = useFeedStore(state => state.selectedFeedId);
    const selectedFolderId = useFolderStore(state => state.selectedFolderId);
    const readAllPostsHandle = useCallback(() => {
        usePostStore.getState().readAllPosts(selectedFeedId ?? undefined, selectedFolderId ?? undefined);
    }, [selectedFeedId, selectedFolderId]);

    const onlyUnread = usePostStore(state => state.onlyUnread);
    const onlyUnreadHandle = () => {
        usePostStore.getState().setOnlyUnread(!onlyUnread);
        refreshHandle();
    };

    return (
        <span className={cn('flex-none space-x-1 text-xl text-gray-500', className)}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button className="" onClick={refreshHandle} size="icon" variant="ghost">
                        <i className="i-mingcute-refresh-2-line text-xl opacity-75" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>刷新</p>
                </TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button onClick={onlyUnreadHandle} size="icon" variant="ghost">
                        <i className={cn('text-xl opacity-75', onlyUnread ? 'i-mingcute-round-fill' : 'i-mingcute-round-line')}></i>
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{onlyUnread ? '显示全部' : '只显示已读'}</p>
                </TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button onClick={readAllPostsHandle} size="icon" variant="ghost">
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

export default memo(Main);
