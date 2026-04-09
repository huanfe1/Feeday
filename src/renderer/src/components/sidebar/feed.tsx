import type { FeedType } from '@/store';
import { useFeedStore, useFolderStore, usePostStore } from '@/store';
import { memo, useState } from 'react';

import Avatar from '@/components/avatar';
import FeedContextMenu from '@/components/sidebar/feed-context-menu';
import FeedEditDialog from '@/components/sidebar/feed-edit-dialog';
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

function Feed({ feed, className }: { feed: FeedType; className?: string }) {
    const isSelected = useFeedStore(state => state.selectedFeedId === feed.id);

    const clickFeed = (e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        useFeedStore.getState().setSelectedFeedId(feed.id ?? null);
        useFolderStore.getState().setSelectedFolderId(null);
        usePostStore.getState().refreshPosts();
    };

    const [active, setActive] = useState<string | null>(null);

    return (
        <>
            <FeedContextMenu feed={feed} onDelete={() => setActive('delete')} onEdit={() => setActive('edit')}>
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
            {active === 'delete' && <DeleteModal feed={feed} onOpenChange={() => setActive(null)} open={active === 'delete'} />}
            {active === 'edit' && <FeedEditDialog feed={feed} onOpenChange={() => setActive(null)} open={active === 'edit'} />}
        </>
    );
}

function DeleteModal({ open, onOpenChange, feed }: { open: boolean; onOpenChange: (open: boolean) => void; feed: FeedType }) {
    const deleteFeed = useFeedStore(state => state.deleteFeed);
    return (
        <AlertDialog onOpenChange={onOpenChange} open={open}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>确定删除吗？</AlertDialogTitle>
                    <AlertDialogDescription>删除后，「{feed.memo ?? feed.title ?? ''}」订阅源及其所有文章将永久删除，无法恢复。</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction onClick={() => feed.id != null && deleteFeed(feed.id)}>确定</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

export default memo(Feed);
