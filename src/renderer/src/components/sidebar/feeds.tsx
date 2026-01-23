import { useFeedStore, useFolderStore, usePostStore } from '@/store';
import { motion } from 'motion/react';
import { memo, useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

import Feed from './feed';

function Feeds({ className }: { className?: string }) {
    const feeds = useFeedStore(useShallow(state => state.feeds.filter(feed => !feed.folder_id)));
    const folders = useFolderStore(state => state.folders);

    const setSelectFeed = useFeedStore(state => state.setSelectedFeedId);
    const setCurrentPost = usePostStore(state => state.setSelectedPost);

    const cancelSelectFeed = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.currentTarget !== e.target) return;
        setSelectFeed(null);
        setCurrentPost(null);
    };

    return (
        <ScrollArea className={cn('min-h-0 flex-1 px-3', className)} onClick={cancelSelectFeed}>
            {feeds.length === 0 && folders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <i className="i-mingcute-rss-line text-muted-foreground mb-3 text-4xl"></i>
                    <p className="text-muted-foreground text-sm">暂无订阅源</p>
                    <p className="text-muted-foreground/70 mt-1 text-xs">点击上方按钮添加订阅源</p>
                </div>
            ) : (
                <>
                    <div className="mt-3 mb-2 ml-2 text-sm font-medium select-none">订阅源</div>
                    {folders.map(folder => (
                        <FolderItem key={folder.id} folder={folder} />
                    ))}
                    {feeds.map(item => (
                        <Feed className="pl-5" key={item.id} feed={item} />
                    ))}
                </>
            )}
        </ScrollArea>
    );
}

const FolderItem = memo(function FolderItem({ folder }: { folder: { id: number | null; name?: string } }) {
    const DURATION = 0.2;

    const feeds = useFeedStore(useShallow(state => state.feeds.filter(feed => feed.folder_id === folder.id)));
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const handleJumpToFeed = ({ detail: id }: CustomEvent<number>) => {
            feeds.some(feed => feed.id === id) && setOpen(true);
        };
        document.addEventListener('jump-to-feed', handleJumpToFeed as EventListener);
        return () => document.removeEventListener('jump-to-feed', handleJumpToFeed as EventListener);
    }, [feeds]);

    return (
        <div>
            <div className="flex cursor-default items-center gap-x-1 p-2" onClick={() => setOpen(!open)}>
                <motion.span className="i-mingcute-right-line" animate={{ rotate: open ? 90 : 0 }} transition={{ duration: DURATION }}></motion.span>
                <span className="text-sm font-medium">{folder.name || '未命名文件夹'}</span>
            </div>
            <motion.div className="overflow-hidden" initial={{ height: 0 }} animate={{ height: open ? 'auto' : 0 }} transition={{ duration: DURATION }}>
                {feeds.map(item => (
                    <Feed className="pl-5" key={item.id} feed={item} />
                ))}
            </motion.div>
        </div>
    );
});

export default memo(Feeds);
