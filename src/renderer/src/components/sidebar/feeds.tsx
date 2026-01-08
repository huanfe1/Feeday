import { useFeedStore, usePostStore } from '@/store';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

import ContextMenu from './contextMenu';

export default function Feeds({ className }: { className?: string }) {
    const { feeds, currentFeed, setCurrentFeed } = useFeedStore();
    const { setCurrentPost } = usePostStore();

    const selectFeed = (e: React.MouseEvent<HTMLDivElement>, feed_id: number) => {
        e.stopPropagation();
        setCurrentFeed(feed_id);
    };

    const cancelSelectFeed = () => {
        setCurrentFeed(null);
        setCurrentPost(null);
    };

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
                        <ContextMenu key={item.id} feed={item}>
                            <div
                                onClick={e => selectFeed(e, item.id)}
                                key={item.id}
                                onDoubleClick={() => window.open(item.link, '_blank')}
                                className={cn('flex items-center justify-center gap-x-3 rounded-sm px-3 py-2 select-none', currentFeed?.id === item.id && 'bg-gray-300/70')}
                            >
                                <Avatar className="size-4">
                                    <AvatarImage
                                        src={
                                            item.icon ||
                                            `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${new URL(item.link).origin}&size=64`
                                        }
                                    />
                                    <AvatarFallback>{item.title.slice(0, 1)}</AvatarFallback>
                                </Avatar>
                                <span className="flex-1 truncate text-sm font-medium capitalize">{item.title}</span>
                                <span className={cn('size-1.5 rounded-full bg-gray-400', { hidden: !item.has_unread })}></span>
                            </div>
                        </ContextMenu>
                    ))}
                </>
            )}
        </ScrollArea>
    );
}
