import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from '@/components/ui/context-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFeed } from '@/lib/store';
import { cn } from '@/lib/utils';

export default function Feeds({ className }: { className?: string }) {
    const [data, setData] = useState<any[]>([]);
    const { feed, setFeed, cancelFeed } = useFeed();

    const [actions, setActions] = useState<string | null>(null);
    const selectedFeed = useRef<any>(null);

    const loadFeeds = () => window.electron.ipcRenderer.invoke('db-get-feeds').then(data => setData(data));
    const deleteFeed = () => {
        window.electron.ipcRenderer.invoke('db-delete-feed', selectedFeed.current.id).then(() => {
            toast.success(`${selectedFeed.current.title} 删除成功`);
            cancelFeed();
            loadFeeds();
        });
    };

    useEffect(() => {
        loadFeeds();
        window.addEventListener('refresh-feeds', loadFeeds);
        return () => window.removeEventListener('refresh-feeds', loadFeeds);
    }, []);

    useEffect(() => console.log(data), [data]);

    return (
        <ScrollArea className={cn('min-h-0 flex-1 px-3', className)}>
            {data.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <i className="i-mingcute-rss-line text-muted-foreground mb-3 text-4xl"></i>
                    <p className="text-muted-foreground text-sm">暂无订阅源</p>
                    <p className="text-muted-foreground/70 mt-1 text-xs">点击上方按钮添加订阅源</p>
                </div>
            ) : (
                <>
                    <div className="mt-3 mb-2 ml-2 text-sm font-medium select-none">订阅源</div>
                    {data.map(item => (
                        <ContextMenu key={item.id} onOpenChange={() => (selectedFeed.current = item)}>
                            <ContextMenuTrigger>
                                <div
                                    onClick={() => setFeed(item)}
                                    key={item.id}
                                    onDoubleClick={() => window.open(item.htmlUrl, '_blank')}
                                    className={cn(
                                        'flex cursor-default items-center justify-center gap-x-3 rounded-sm px-3 py-2 select-none',
                                        feed.id === item.id && 'bg-gray-300/70',
                                    )}
                                >
                                    <Avatar className="size-4">
                                        <AvatarImage
                                            src={
                                                item.icon ||
                                                `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${new URL(item.htmlUrl).origin}&size=64`
                                            }
                                        />
                                        <AvatarFallback>{item.title.slice(0, 1)}</AvatarFallback>
                                    </Avatar>
                                    <span className="flex-1 truncate text-sm font-medium capitalize">{item.title}</span>
                                </div>
                            </ContextMenuTrigger>
                            <ContextMenuContent>
                                <ContextMenuItem>编辑</ContextMenuItem>
                                <ContextMenuItem onSelect={() => setActions('delete')}>删除</ContextMenuItem>
                                <ContextMenuSeparator />
                                <ContextMenuItem onSelect={() => window.open(selectedFeed.current.htmlUrl, '_blank')}>在浏览器中打开网站</ContextMenuItem>
                                <ContextMenuItem onSelect={() => window.open(selectedFeed.current.xmlUrl, '_blank')}>在浏览器中打开订阅源</ContextMenuItem>
                            </ContextMenuContent>
                        </ContextMenu>
                    ))}
                    <AlertDialog open={actions === 'delete'} onOpenChange={() => setActions(null)}>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>确定删除吗？</AlertDialogTitle>
                                <AlertDialogDescription>删除后，该订阅源及其所有文章将永久删除，无法恢复。</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>取消</AlertDialogCancel>
                                <AlertDialogAction onClick={deleteFeed}>确定</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </>
            )}
        </ScrollArea>
    );
}
