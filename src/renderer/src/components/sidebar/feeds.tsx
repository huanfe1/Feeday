import { useFeedStore, useFolderStore, usePostStore, useView } from '@/store';
import type { FeedType } from '@/store';
import { AnimatePresence, motion } from 'motion/react';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { type EventMap, eventBus } from '@/lib/events';
import { cn } from '@/lib/utils';

import Feed from './feed';

function Feeds({ className }: { className?: string }) {
    const allFeeds = useFeedStore(useShallow(state => state.feeds));
    const folders = useFolderStore(state => state.folders);
    const view = useView(state => state.view);
    const feeds = useMemo(() => allFeeds.filter(feed => feed.view === view), [allFeeds, view]);
    const [direction, setDirection] = useState<'left' | 'right' | null>(null);
    const width = Number(localStorage.getItem('resizable:feeds-sidebar'));

    const cancelSelectFeed = () => {
        useFeedStore.getState().setSelectedFeedId(null);
        useFolderStore.getState().setSelectedFolderId(null);
        usePostStore.getState().setSelectedPost(null);
        usePostStore.getState().refreshPosts();
    };

    const setView = useView(state => state.setView);
    const toggleView = (value: number) => {
        setDirection(value > view ? 'right' : 'left');
        setView(value);
    };

    useEffect(() => cancelSelectFeed(), [view]);

    return (
        <ScrollArea className={cn('min-h-0 flex-1 overflow-hidden px-3', className)} onClick={cancelSelectFeed}>
            <div className="mt-3 mb-2 flex items-center justify-between text-sm font-medium select-none">
                <span>订阅源</span>
                <Tabs onValueChange={value => toggleView(Number(value))} value={view.toString()}>
                    <TabsList className="h-8 bg-gray-200/75 px-1">
                        <TabsTrigger className="h-full px-3" value="1">
                            文章
                        </TabsTrigger>
                        <TabsTrigger className="h-full px-3" value="2">
                            媒体
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>
            <AnimatePresence initial={false} mode="popLayout">
                <motion.div
                    animate={{ x: 0 }}
                    exit={{ x: direction === 'right' ? width : -width }}
                    initial={{ x: direction === 'right' ? width : -width }}
                    key={view.toString()}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                >
                    {feeds.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <i className="i-mingcute-rss-line text-muted-foreground mb-3 text-4xl"></i>
                            <p className="text-muted-foreground text-sm">暂无订阅源</p>
                            <p className="text-muted-foreground/70 mt-1 text-xs">点击上方按钮添加订阅源</p>
                        </div>
                    ) : (
                        <div onClick={e => e.stopPropagation()}>
                            {folders.map(folder => (
                                <FolderItem id={folder.id} feeds={feeds.filter(feed => feed.folderId === folder.id)} isOpen={folder.isOpen} key={folder.id} name={folder.name} />
                            ))}
                            <FolderItem id={0} feeds={feeds.filter(feed => feed.folderId === null)} key={0} />
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>
        </ScrollArea>
    );
}

const FolderItem = memo(function FolderItem({ name, id, feeds, isOpen = false }: { name?: string; id: number | null; feeds: FeedType[]; isOpen?: boolean }) {
    const DURATION = 0.2;

    const needJumpFeedId = useRef<number | null>(null);
    const needJumpPostId = useRef<number | null>(null);

    const isSelected = useFolderStore(state => state.selectedFolderId === id);
    const setFolderOpen = useFolderStore(state => state.setFolderOpen);

    const clickFolder = (e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        useFolderStore.getState().setSelectedFolderId(id);
        useFeedStore.getState().setSelectedFeedId(null);
        usePostStore.getState().refreshPosts();
    };

    const clickHandle = (e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        if (id !== null) setFolderOpen(id, !isOpen);
    };

    const scrollToFeed = () => {
        // TODO: Feeds 存在滚动条，且目标文件夹未打开时，点击跳转等待文件夹打开时滚动条会出现抽搐
        // 似乎是因为文件夹打开导致的滚动条位置变化
        if (!needJumpFeedId.current || !needJumpPostId.current) return;
        const feedElement = document.getElementById(`feed-${needJumpFeedId.current}`);
        if (feedElement) {
            useFolderStore.getState().setSelectedFolderId(null);
            useFeedStore.getState().setSelectedFeedId(needJumpFeedId.current);
            usePostStore.getState().refreshPosts();
            feedElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            usePostStore.getState().setSelectedPost(needJumpPostId.current);
            needJumpFeedId.current = null;
            needJumpPostId.current = null;
        }
    };

    useEffect(() => {
        const handleJumpToFeed = ({ feedId, postId }: EventMap['jump-to-feed']) => {
            if (!feeds.some(feed => feed.id === feedId)) return;
            needJumpFeedId.current = feedId;
            needJumpPostId.current = postId;
            if (id === null || isOpen) {
                scrollToFeed();
            } else {
                setFolderOpen(id, true);
            }
        };
        const removeListener = eventBus.on('jump-to-feed', handleJumpToFeed);
        return () => removeListener();
    }, [feeds, setFolderOpen, id, isOpen]);

    if (feeds.length === 0) return null;
    if (id === 0) return feeds.map(item => <Feed className="pl-5" feed={item} key={item.id} />);
    return (
        <div>
            <div className={cn('flex cursor-default items-center gap-x-1 rounded-sm p-2', isSelected && 'bg-gray-300/70')} onClick={clickFolder}>
                <motion.span className="i-mingcute-right-line" animate={{ rotate: isOpen ? 90 : 0 }} initial={false} onClick={clickHandle} transition={{ duration: DURATION }} />
                <span className="w-full text-sm font-medium">{name || '未命名文件夹'}</span>
            </div>
            <AnimatePresence initial={false}>
                {isOpen && (
                    <motion.div
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        initial={{ height: 0 }}
                        key="folder-content"
                        onAnimationComplete={() => scrollToFeed()}
                        style={{ overflow: 'hidden' }}
                        transition={{ duration: DURATION, ease: 'easeInOut' }}
                    >
                        {feeds.map(item => (
                            <Feed className="pl-5" feed={item} key={item.id} />
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
});

export default memo(Feeds);
