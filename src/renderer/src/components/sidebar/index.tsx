import { useEffect, useState } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

import Header from './header';

export default function Sidebar() {
    const [data, setData] = useState<any[]>([]);
    const [selectedFeedId, setSelectedFeedId] = useState<number | null>(null);

    const loadFeeds = () => {
        window.electron.ipcRenderer.invoke('db-get-feeds').then(data => setData(data));
    };

    useEffect(() => {
        loadFeeds();
        const handleRefreshFeeds = () => loadFeeds();
        window.addEventListener('refresh-feeds', handleRefreshFeeds);
        return () => {
            window.removeEventListener('refresh-feeds', handleRefreshFeeds);
        };
    }, []);

    return (
        <div className="bg-sidebar flex h-full flex-col">
            <Header />
            <Separator />
            <div className="flex-1 overflow-y-auto px-3 py-4">
                {data.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <i className="i-mingcute-rss-line text-muted-foreground mb-3 text-4xl"></i>
                        <p className="text-muted-foreground text-sm">暂无订阅源</p>
                        <p className="text-muted-foreground/70 mt-1 text-xs">点击上方按钮添加订阅源</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-1">
                        {data.map(item => (
                            <Button
                                key={item.id}
                                variant={selectedFeedId === item.id ? 'secondary' : 'ghost'}
                                className="h-auto justify-start gap-3 px-3 py-2.5 text-left"
                                onClick={() => setSelectedFeedId(item.id)}
                            >
                                <Avatar className="size-4">
                                    <AvatarImage
                                        src={`https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${new URL(item.link).origin}&size=64`}
                                    />
                                    <AvatarFallback>{item.title.slice(0, 1)}</AvatarFallback>
                                </Avatar>
                                <span className="flex-1 truncate text-sm font-medium">{item.title}</span>
                            </Button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
