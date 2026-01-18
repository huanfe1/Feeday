import { useFeedStore, usePostStore } from '@/store';
import { memo, useMemo } from 'react';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

import Feed from './feed';

function Feeds({ className }: { className?: string }) {
    const feeds = useFeedStore(state => state.feeds);

    const setSelectFeed = useFeedStore(state => state.setSelectedFeedId);
    const setCurrentPost = usePostStore(state => state.setSelectedPost);

    const cancelSelectFeed = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.currentTarget !== e.target) return;
        setSelectFeed(null);
        setCurrentPost(null);
    };

    // 按文件夹分组 feeds
    const groupedFeeds = useMemo(() => {
        const groups: Record<string | number, typeof feeds> = {};
        const ungrouped: typeof feeds = [];

        feeds.forEach(feed => {
            if (feed.folder_id && feed.folder_name) {
                if (!groups[feed.folder_id]) {
                    groups[feed.folder_id] = [];
                }
                groups[feed.folder_id].push(feed);
            } else {
                ungrouped.push(feed);
            }
        });

        return { groups, ungrouped };
    }, [feeds]);

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
                    <Accordion type="multiple" className="w-full">
                        {Object.entries(groupedFeeds.groups).map(([folderId, folderFeeds]) => {
                            const folderName = folderFeeds[0]?.folder_name || '未命名文件夹';
                            return (
                                <AccordionItem key={folderId} value={`folder-${folderId}`} className="border-none">
                                    <AccordionTrigger className="px-2 py-2 text-sm font-medium hover:no-underline">{folderName}</AccordionTrigger>
                                    <AccordionContent className="pb-1">
                                        {folderFeeds.map(item => (
                                            <Feed className="pl-5" key={item.id} feed={item} />
                                        ))}
                                    </AccordionContent>
                                </AccordionItem>
                            );
                        })}
                        {groupedFeeds.ungrouped.length > 0 && (
                            <div className="mt-1">
                                {groupedFeeds.ungrouped.map(item => (
                                    <Feed key={item.id} feed={item} />
                                ))}
                            </div>
                        )}
                    </Accordion>
                </>
            )}
        </ScrollArea>
    );
}

export default memo(Feeds);
