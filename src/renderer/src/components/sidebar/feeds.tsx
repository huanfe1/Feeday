import { useFeedStore, usePostStore } from '@/store';
import type { FeedType } from '@/store';
import { memo, useCallback } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

import ContextMenu from './contextMenu';

const FeedItem = memo(function FeedItem({ feed }: { feed: FeedType }) {
    // 只订阅当前 feed 是否被选中，而不是整个 currentFeed 对象
    const isSelected = useFeedStore(state => state.currentFeed?.id === feed.id);
    const setCurrentFeed = useFeedStore(state => state.setCurrentFeed);

    const selectFeed = useCallback(
        (e: React.MouseEvent<HTMLDivElement>) => {
            e.stopPropagation();
            setCurrentFeed(feed.id);
        },
        [feed.id, setCurrentFeed],
    );

    const handleDoubleClick = useCallback(() => {
        window.open(feed.link, '_blank');
    }, [feed.link]);

    return (
        <ContextMenu feed={feed}>
            <div
                onClick={selectFeed}
                onDoubleClick={handleDoubleClick}
                className={cn('flex items-center justify-center gap-x-3 rounded-sm px-3 py-2 select-none', isSelected && 'bg-gray-300/70')}
            >
                <Avatar className="size-4">
                    <AvatarImage
                        src={feed.icon || `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${new URL(feed.link).origin}&size=64`}
                    />
                    <AvatarFallback>{feed.title.slice(0, 1)}</AvatarFallback>
                </Avatar>
                <span className="flex-1 truncate text-sm font-medium capitalize">{feed.title}</span>
                <span className={cn('size-1.5 rounded-full bg-gray-400', { hidden: !feed.has_unread })}></span>
            </div>
        </ContextMenu>
    );
});

export default function Feeds({ className }: { className?: string }) {
    const feeds = useFeedStore(state => state.feeds);
    const setCurrentFeed = useFeedStore(state => state.setCurrentFeed);
    const setCurrentPost = usePostStore(state => state.setCurrentPost);

    const cancelSelectFeed = useCallback(() => {
        setCurrentFeed(null);
        setCurrentPost(null);
    }, [setCurrentFeed, setCurrentPost]);

    return (
        <ScrollArea className={cn('min-h-0 flex-1 px-3', className)} onClick={cancelSelectFeed}>
            {feeds.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <i className="i-mingcute-rss-line text-muted-foreground mb-3 text-4xl"></i>
                    <p className="text-muted-foreground text-sm">暂无订阅源</p>
                    <p className="text-muted-foreground/70 mt-1 text-xs">点击上方按钮添加订阅源</p>
                </div>
            ) : (
                <>
                    <div className="mt-3 mb-2 ml-2 text-sm font-medium select-none">订阅源</div>
                    {feeds.map(item => (
                        <FeedItem key={item.id} feed={item} />
                    ))}
                </>
            )}
        </ScrollArea>
    );
}
