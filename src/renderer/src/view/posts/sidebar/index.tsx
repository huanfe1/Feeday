import { useFeedStore, useFolderStore, usePostStore } from '@/store';
import { useVirtualizer } from '@tanstack/react-virtual';
import { AnimatePresence, motion } from 'motion/react';
import { memo, useCallback, useEffect, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';

import Resizable from '@/components/resizable';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn, enterVariants } from '@/lib/utils';

import Post from './post';

export default function Sidebar() {
    const selectedFeed = useFeedStore(state => state.getSelectedFeed());
    const selectedFolderId = useFolderStore(state => state.selectedFolderId);
    const selectedFolder = useFolderStore(state => state.getSelectedFolder());

    const postIds = usePostStore(useShallow(state => state.posts.map(p => p.id)));
    const onlyUnread = usePostStore(state => state.onlyUnread);

    const parentRef = useRef<HTMLDivElement>(null);
    // eslint-disable-next-line react-hooks/incompatible-library
    const virtualizer = useVirtualizer({
        count: postIds.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 125,
        overscan: 3,
    });

    useEffect(() => virtualizer.scrollToIndex(0), [postIds, virtualizer]);

    return (
        <Resizable id="posts-sidebar" options={{ axis: 'x', min: 300, max: 400, initial: 300 }}>
            <div className="flex h-full w-full flex-col overflow-y-hidden">
                <div className="drag-region mx-4 flex h-15 items-center justify-between gap-4">
                    <h3 className="truncate text-lg font-bold">{selectedFolder?.name || selectedFeed?.title || '文章列表'}</h3>
                    <Buttons />
                </div>
                <AnimatePresence mode="wait">
                    <motion.div
                        className="w-full flex-1 overflow-y-hidden"
                        key={[onlyUnread, selectedFeed?.id, selectedFolderId].join('-')}
                        {...enterVariants}
                        transition={{ duration: 0.1, ease: 'easeIn' }}
                    >
                        <ScrollArea className="flex h-full" viewportRef={parentRef}>
                            {postIds.length === 0 ? (
                                <div className="flex h-[calc(100vh-60px)] items-center justify-center text-gray-400 select-none">
                                    <div className="flex flex-col items-center gap-y-3">
                                        <i className="i-mingcute-celebrate-line text-3xl"></i>
                                        <span>全部已读</span>
                                    </div>
                                </div>
                            ) : (
                                <div
                                    style={{
                                        height: `${virtualizer.getTotalSize()}px`,
                                        width: '100%',
                                        position: 'relative',
                                    }}
                                >
                                    {virtualizer.getVirtualItems().map(virtualItem => {
                                        const postId = postIds[virtualItem.index];
                                        return (
                                            <div
                                                data-index={virtualItem.index}
                                                key={postId}
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
                                                <Post id={postId} key={postId} />
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </ScrollArea>
                    </motion.div>
                </AnimatePresence>
            </div>
        </Resizable>
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
