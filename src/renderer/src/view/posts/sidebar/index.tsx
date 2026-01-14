import { useFeedStore, usePostStore } from '@/store';
import { AnimatePresence, motion } from 'motion/react';
import { memo, useCallback, useEffect, useState } from 'react';

import { Resizable } from '@/components/resizable';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

import Post from './post';

export default function Sidebar() {
    const [onlyUnread, setOnlyUnread] = useState<boolean>(false);

    const selectFeed = useFeedStore(state => state.getSelectFeed());

    const posts = usePostStore(state => state.posts);
    const refreshPosts = usePostStore(state => state.refreshPosts);
    const readAllPosts = usePostStore(state => state.readAllPosts);

    const loadPosts = useCallback(() => refreshPosts(selectFeed?.id, onlyUnread), [selectFeed?.id, onlyUnread, refreshPosts]);
    useEffect(() => loadPosts(), [loadPosts]);

    return (
        <Resizable options={{ axis: 'x', min: 300, max: 400, initial: 300 }}>
            <div className="flex h-full w-full flex-col overflow-y-hidden">
                <div className="drag-region mx-4 flex h-[60px] items-center justify-between gap-4">
                    <h3 className="truncate text-lg font-bold">{selectFeed?.title || '文章列表'}</h3>
                    <span className="flex-none space-x-1 text-xl text-gray-500">
                        <RefreshButton />
                        <Tooltip>
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
                                <Button variant="ghost" size="icon" onClick={() => readAllPosts(selectFeed?.id)}>
                                    <i className="i-mingcute-check-circle-line text-xl opacity-75"></i>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>全部标为已读</p>
                            </TooltipContent>
                        </Tooltip>
                    </span>
                </div>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={`${selectFeed?.id || 'all'}-${onlyUnread ? 'unread' : 'all'}`}
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
                            <ScrollArea scrollKey={selectFeed?.id} className="flex h-full">
                                {posts.map(post => (
                                    <Post key={post.id} post={post} />
                                ))}
                            </ScrollArea>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </Resizable>
    );
}

const RefreshButton = memo(function RefreshButton() {
    const refreshFeeds = useFeedStore(state => state.refreshFeeds);
    const refreshPosts = usePostStore(state => state.refreshPosts);

    const onClick = () => {
        refreshFeeds();
        refreshPosts();
    };

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button variant="ghost" className="" size="icon" onClick={onClick}>
                    <i className="i-mingcute-refresh-2-line text-xl opacity-75" />
                </Button>
            </TooltipTrigger>
            <TooltipContent>
                <p>刷新</p>
            </TooltipContent>
        </Tooltip>
    );
});
