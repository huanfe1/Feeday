import { useStore } from '@/store';
import type { GetFeedsResult } from '@shared/types/database';
import { memo } from 'react';
import { toast } from 'sonner';

import Avatar from '@/components/avatar';
import { alertDialog } from '@/components/modal/dialog';
import FeedContextMenu from '@/components/sidebar/feed-context-menu';
import { feedEditDialog } from '@/components/sidebar/feed-edit-dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { eventBus } from '@/lib/events';
import { cn } from '@/lib/utils';

function Feed({ feed, className }: { feed: GetFeedsResult; className?: string }) {
    const isSelected = useStore(state => state.feedKey === `feed-${feed.id}`);

    const clickFeed = (e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        useStore.getState().setFeedKey(`feed-${feed.id}`);
    };

    const handleDeleteFeed = () => {
        const title = feed.memo ?? feed.title;
        alertDialog({
            title: '删除',
            description: `删除后，「${title}」订阅源及其所有文章将永久删除，无法恢复`,
            confirmVariant: 'destructive',
        }).then(() => {
            window.electron.ipcRenderer.invoke('db-delete-feed', feed.id).then(() => {
                toast.success(`订阅源「${title}」删除成功`);
                eventBus.emit('refresh-feeds', null);
            });
        });
    };

    return (
        <>
            <FeedContextMenu feed={feed} onDelete={handleDeleteFeed} onEdit={() => feedEditDialog(feed)}>
                <div
                    className={cn('flex items-center gap-x-3 rounded-sm px-3 py-2 select-none', { 'bg-sidebar-accent': isSelected }, className)}
                    id={`feed-${feed.id}`}
                    onClick={clickFeed}
                    onDoubleClick={() => window.open(feed.link, '_blank')}
                >
                    <Avatar defaultAvatarUrl={feed.icon ?? undefined} domain={feed.link ?? ''} title={feed.memo ?? feed.title ?? ''} />
                    <span className="flex-1 truncate text-sm font-medium capitalize">{feed.memo ?? feed.title ?? ''}</span>
                    {feed.lastFetchError && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span className="i-mingcute-close-circle-fill text-red-500"></span>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{feed.lastFetchError}</p>
                            </TooltipContent>
                        </Tooltip>
                    )}
                    <span className={cn('size-1.5 rounded-full bg-gray-400', { hidden: !feed.hasUnread })}></span>
                </div>
            </FeedContextMenu>
        </>
    );
}

export default memo(Feed);
