import { useFeedStore, useFolderStore, usePostStore } from '@/store';
import { AnimatePresence, motion } from 'motion/react';
import { memo, useCallback } from 'react';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

import Render from './render';

function Main() {
    const mediaList = usePostStore(state => state.posts).slice(0, 10);
    const onlyUnread = usePostStore(state => state.onlyUnread);
    const selectedFeedId = useFeedStore(state => state.selectedFeedId);
    const selectFeed = useFeedStore(state => state.getSelectedFeed());
    const selectedFolderId = useFolderStore(state => state.selectedFolderId);
    const selectedFolder = useFolderStore(state => state.getSelectedFolder());

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
                    <ScrollArea className="h-full min-h-0">
                        <div className="grid grid-cols-3 gap-2 px-4 pt-2 2xl:grid-cols-4">
                            {mediaList.map(media => (
                                <Render key={media.id} media={media} />
                            ))}
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
