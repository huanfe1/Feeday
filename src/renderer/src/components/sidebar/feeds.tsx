import { useFeedStore, usePostStore } from '@/store';

import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

import Feed from './feed';

export default function Feeds({ className }: { className?: string }) {
    const feeds = useFeedStore(state => state.feeds);
    const setSelectFeed = useFeedStore(state => state.setSelectFeed);
    const setCurrentPost = usePostStore(state => state.setCurrentPost);

    const cancelSelectFeed = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.currentTarget !== e.target) return;
        setSelectFeed(null);
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
                        <Feed key={item.id} feed={item} />
                    ))}
                </>
            )}
        </ScrollArea>
    );
}
