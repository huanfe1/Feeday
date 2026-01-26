import { useFeedStore, useFolderStore, usePostStore } from '@/store';
import { useVirtualizer } from '@tanstack/react-virtual';
import { AnimatePresence, motion } from 'motion/react';
import { memo, useCallback, useEffect, useRef } from 'react';

import { Resizable } from '@/components/resizable';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

import Post from './post';

export default function Sidebar() {
    const selectFeed = useFeedStore(state => state.getSelectedFeed());
    const selectedFeedId = useFeedStore(state => state.selectedFeedId);
    const selectedFolderId = useFolderStore(state => state.selectedFolderId);
    const selectedFolder = useFolderStore(state => state.getSelectedFolder());

    const posts = usePostStore(state => state.posts);
    const onlyUnread = usePostStore(state => state.onlyUnread);

    const parentRef = useRef<HTMLDivElement>(null);
    // eslint-disable-next-line react-hooks/incompatible-library
    const virtualizer = useVirtualizer({
        count: posts.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 125,
        overscan: 3,
    });

    useEffect(() => {
        virtualizer.scrollToIndex(0);
        usePostStore.getState().refreshPosts();
    }, [onlyUnread, selectedFeedId, selectedFolderId, virtualizer]);

    return (
        <Resizable id="posts-sidebar" options={{ axis: 'x', min: 300, max: 400, initial: 300 }}>
            <div className="flex h-full w-full flex-col overflow-y-hidden">
                <div className="drag-region mx-4 flex h-[60px] items-center justify-between gap-4">
                    <h3 className="truncate text-lg font-bold">{selectedFolder?.name || selectFeed?.title || '文章列表'}</h3>
                    <Buttons />
                </div>
                <AnimatePresence mode="wait">
                    <motion.div
                        className="w-full flex-1 overflow-y-hidden"
                        key={[onlyUnread, selectedFeedId, selectedFolderId].join('-')}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.1, ease: 'easeIn' }}
                    >
                        <ScrollArea className="flex h-full" viewportRef={parentRef}>
                            {posts.length === 0 ? (
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
                                        const post = posts[virtualItem.index];
                                        return (
                                            <div
                                                key={post.id}
                                                data-index={virtualItem.index}
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
                                                <Post post={post} />
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
    const setOnlyUnread = usePostStore(state => state.setOnlyUnread);

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
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={() => setOnlyUnread(!onlyUnread)}>
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
