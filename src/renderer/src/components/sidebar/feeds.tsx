import { useEffect, useState } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useFeed } from '@/lib/store';
import { cn } from '@/lib/utils';

export default function Feeds({ className }: { className?: string }) {
    const [data, setData] = useState<any[]>([]);
    const { feed, setFeed } = useFeed();
    const loadFeeds = () => {
        window.electron.ipcRenderer.invoke('db-get-feeds').then(data => setData(data));
    };

    useEffect(() => {
        loadFeeds();
        window.addEventListener('refresh-feeds', loadFeeds);
        return () => window.removeEventListener('refresh-feeds', loadFeeds);
    }, []);

    return (
        <div className={cn('flex-1 overflow-y-auto px-3 py-4', className)}>
            {data.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <i className="i-mingcute-rss-line text-muted-foreground mb-3 text-4xl"></i>
                    <p className="text-muted-foreground text-sm">暂无订阅源</p>
                    <p className="text-muted-foreground/70 mt-1 text-xs">点击上方按钮添加订阅源</p>
                </div>
            ) : (
                <div className="flex flex-col gap-y-1">
                    {data.map(item => (
                        <div
                            onClick={() => setFeed(item)}
                            key={item.id}
                            className={cn('flex cursor-default items-center justify-center gap-x-3 rounded-sm px-3 py-2', feed.id === item.id && 'bg-gray-300/70')}
                        >
                            <Avatar className="size-4">
                                <AvatarImage
                                    src={`https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${new URL(item.link).origin}&size=64`}
                                />
                                <AvatarFallback>{item.title.slice(0, 1)}</AvatarFallback>
                            </Avatar>
                            <span className="flex-1 truncate text-sm font-medium capitalize">{item.title}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
