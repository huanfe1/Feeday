import { useFeedStore, useFolderStore, usePostStore } from '@/store';
import { useVirtualizer } from '@tanstack/react-virtual';
import { AnimatePresence, motion } from 'motion/react';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

import Render from './render';

function Main() {
    const mediaList = usePostStore(state => state.posts);
    const onlyUnread = usePostStore(state => state.onlyUnread);
    const selectedFeedId = useFeedStore(state => state.selectedFeedId);
    const selectFeed = useFeedStore(state => state.getSelectedFeed());
    const selectedFolderId = useFolderStore(state => state.selectedFolderId);
    const selectedFolder = useFolderStore(state => state.getSelectedFolder());

    const parentRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [columnsPerRow, setColumnsPerRow] = useState(3);

    // 检测列数变化（响应式）
    useEffect(() => {
        const updateColumns = () => {
            // 优先使用 containerRef（包含 grid 的容器），如果没有则使用 parentRef（viewport）
            const targetElement = containerRef.current || parentRef.current;
            if (targetElement && targetElement.offsetWidth > 0) {
                const width = targetElement.offsetWidth;
                // 根据宽度判断（考虑到窗口最小宽度为 1000px）：
                // < 900px: 2 列
                // 900px - 1280px: 3 列
                // >= 1280px: 4 列
                let newColumns = 3;
                if (width >= 1280) {
                    newColumns = 4;
                } else if (width < 900) {
                    newColumns = 2;
                } else {
                    newColumns = 3;
                }
                setColumnsPerRow(prev => {
                    if (prev !== newColumns) {
                        return newColumns;
                    }
                    return prev;
                });
            }
        };

        // 初始检查 - 延迟执行确保元素已挂载
        const initialTimeout = setTimeout(updateColumns, 0);

        const resizeObserver = new ResizeObserver(() => {
            // 使用 requestAnimationFrame 确保在下一帧检查，此时布局已完成
            requestAnimationFrame(updateColumns);
        });

        // 延迟设置观察器，确保元素已挂载
        const setupObserver = () => {
            const container = containerRef.current;
            const viewport = parentRef.current;

            if (container) {
                resizeObserver.observe(container);
            }
            if (viewport && viewport !== container) {
                resizeObserver.observe(viewport);
            }
            updateColumns();
        };

        // 立即尝试设置，如果元素还没挂载则延迟
        setupObserver();
        const setupTimeout = setTimeout(setupObserver, 100);

        return () => {
            clearTimeout(initialTimeout);
            clearTimeout(setupTimeout);
            resizeObserver.disconnect();
        };
    }, [onlyUnread, selectedFeedId, selectedFolderId]);

    // 将项目按行分组
    const rows = useMemo(() => {
        const result: (typeof mediaList)[] = [];
        for (let i = 0; i < mediaList.length; i += columnsPerRow) {
            result.push(mediaList.slice(i, i + columnsPerRow));
        }
        return result;
    }, [mediaList, columnsPerRow]);

    // 估算每行高度：aspect-video (9/16) + 标题 + 信息 + padding + gap
    // 2列时每项约 480px，高度约 480 * 9/16 + 60 ≈ 330px
    // 3列时每项约 320px，高度约 320 * 9/16 + 60 ≈ 240px
    // 4列时每项约 240px，高度约 240 * 9/16 + 60 ≈ 195px
    const estimateRowHeight = useCallback(() => {
        const targetElement = containerRef.current || parentRef.current;
        if (!targetElement) return 240;
        const containerWidth = targetElement.offsetWidth || 1000;
        const padding = 32; // px-4 = 16px * 2
        const gap = 8; // gap-2 = 8px
        const itemWidth = (containerWidth - padding - gap * (columnsPerRow - 1)) / columnsPerRow;
        const imageHeight = itemWidth * (9 / 16); // aspect-video
        const textHeight = 60; // 标题 + 信息行
        const paddingHeight = 16; // p-2 = 8px * 2
        return imageHeight + textHeight + paddingHeight + gap;
    }, [columnsPerRow]);

    // eslint-disable-next-line react-hooks/incompatible-library
    const virtualizer = useVirtualizer({
        count: rows.length,
        getScrollElement: () => parentRef.current,
        estimateSize: estimateRowHeight,
        overscan: 2,
    });

    useEffect(() => {
        virtualizer.scrollToIndex(0);
    }, [mediaList, columnsPerRow, virtualizer]);

    if (mediaList.length === 0) return null;

    return (
        <div className="flex h-full w-full flex-col overflow-hidden">
            <div className="flex h-15 items-center justify-between gap-4 px-4">
                <h3 className="truncate text-lg font-bold">{selectedFolder?.name || selectFeed?.title || '媒体列表'}</h3>
                <Buttons />
            </div>
            <AnimatePresence mode="wait">
                <motion.div
                    className="h-full"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    key={[onlyUnread, selectedFeedId, selectedFolderId].join('-')}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                >
                    <ScrollArea className="h-full min-h-0" viewportRef={parentRef}>
                        <div
                            ref={containerRef}
                            style={{
                                height: `${virtualizer.getTotalSize()}px`,
                                width: '100%',
                                position: 'relative',
                            }}
                        >
                            {virtualizer.getVirtualItems().map(virtualRow => {
                                const rowItems = rows[virtualRow.index];
                                return (
                                    <div
                                        key={virtualRow.index}
                                        data-index={virtualRow.index}
                                        ref={virtualizer.measureElement}
                                        style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            width: '100%',
                                            transform: `translateY(${virtualRow.start}px)`,
                                            willChange: 'transform',
                                        }}
                                    >
                                        <div
                                            className={cn('grid gap-2 px-4 pt-2', {
                                                'grid-cols-2': columnsPerRow === 2,
                                                'grid-cols-3': columnsPerRow === 3,
                                                'grid-cols-4': columnsPerRow === 4,
                                            })}
                                        >
                                            {rowItems.map(media => (
                                                <Render key={media.id} media={media} />
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </ScrollArea>
                </motion.div>
            </AnimatePresence>
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
                    <Button className="" variant="ghost" size="icon" onClick={refreshHandle}>
                        <i className="i-mingcute-refresh-2-line text-xl opacity-75" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>刷新</p>
                </TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={onlyUnreadHandle}>
                        <i className={cn('text-xl opacity-75', onlyUnread ? 'i-mingcute-round-fill' : 'i-mingcute-round-line')}></i>
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{onlyUnread ? '显示全部' : '只显示已读'}</p>
                </TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={readAllPostsHandle}>
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
