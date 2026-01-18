import { useFeedStore, usePostStore } from '@/store';
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

    // const posts = usePostStore.getState().posts;
    // usePostStore(state => state.posts.length);
    const posts = usePostStore(state => state.posts);

    const refreshPosts = usePostStore(state => state.refreshPosts);
    const loadMorePosts = usePostStore(state => state.loadMorePosts);
    const hasMore = usePostStore(state => state.hasMore);
    const isLoading = usePostStore(state => state.isLoading);

    const hasUnread = usePostStore(state => state.onlyUnread);

    // 优化：使用useCallback稳定函数引用
    const handleRefresh = useCallback(() => {
        refreshPosts();
    }, [refreshPosts]);

    useEffect(() => {
        refreshPosts();
    }, [refreshPosts, selectedFeedId]);

    // 无限滚动处理
    const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const handleScroll = useCallback(
        (e: React.UIEvent<HTMLDivElement>) => {
            const target = e.currentTarget;
            const { scrollTop, scrollHeight, clientHeight } = target;

            // 当滚动到距离底部 200px 以内时，加载更多
            if (scrollHeight - scrollTop - clientHeight < 200 && hasMore && !isLoading) {
                // 使用防抖，避免频繁触发
                if (scrollTimeoutRef.current) {
                    clearTimeout(scrollTimeoutRef.current);
                }
                scrollTimeoutRef.current = setTimeout(() => {
                    loadMorePosts();
                }, 100);
            }
        },
        [hasMore, isLoading, loadMorePosts],
    );

    useEffect(() => {
        handleRefresh();
    }, [handleRefresh, hasUnread]);

    // 清理定时器
    useEffect(() => {
        return () => {
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
        };
    }, []);

    return (
        <Resizable options={{ axis: 'x', min: 300, max: 400, initial: 300 }}>
            <div className="flex h-full w-full flex-col overflow-y-hidden">
                <div className="drag-region mx-4 flex h-[60px] items-center justify-between gap-4">
                    <h3 className="truncate text-lg font-bold">{selectFeed?.title || '文章列表'}</h3>
                    <Buttons />
                </div>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={`${selectedFeedId || 'all'}-${hasUnread ? 'unread' : 'all'}`}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.1, ease: 'easeIn' }}
                        className="w-full flex-1 overflow-y-hidden"
                    >
                        {posts.length === 0 ? (
                            <div className="flex h-full items-center justify-center text-gray-400 select-none">
                                <div className="flex flex-col items-center gap-y-3">
                                    <i className="i-mingcute-celebrate-line text-3xl"></i>
                                    <span>全部已读</span>
                                </div>
                            </div>
                        ) : (
                            <ScrollArea scrollKey={selectedFeedId ?? ''} className="flex h-full" onScroll={handleScroll}>
                                {posts.map(post => (
                                    <Post key={post.id} post={post} />
                                ))}
                                {isLoading && (
                                    <div className="flex items-center justify-center py-4 text-gray-400">
                                        <i className="i-mingcute-loading-line animate-spin text-xl"></i>
                                        <span className="ml-2 text-sm">加载中...</span>
                                    </div>
                                )}
                                {!hasMore && posts.length > 0 && (
                                    <div className="flex items-center justify-center py-4 text-sm text-gray-400">
                                        <span>没有更多了</span>
                                    </div>
                                )}
                            </ScrollArea>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </Resizable>
    );
}

const Buttons = memo(function Buttons({ className }: { className?: string }) {
    const refreshFeeds = useFeedStore(state => state.refreshFeeds);
    const refreshPosts = usePostStore(state => state.refreshPosts);

    const onClick = useCallback(() => {
        refreshFeeds();
        refreshPosts();
    }, [refreshFeeds, refreshPosts]);

    const onlyUnread = usePostStore(state => state.onlyUnread);
    const setOnlyUnread = usePostStore(state => state.setOnlyUnread);

    const readAllPosts = usePostStore(state => state.readAllPosts);
    const selectedFeedId = useFeedStore(state => state.selectedFeedId);

    return (
        <span className={cn('flex-none space-x-1 text-xl text-gray-500', className)}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" className="" size="icon" onClick={onClick}>
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
                    <Button variant="ghost" size="icon" onClick={() => readAllPosts(selectedFeedId ?? undefined)}>
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
