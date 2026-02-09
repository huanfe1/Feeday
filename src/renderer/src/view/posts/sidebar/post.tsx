import type { PostType } from '@/store';
import { useFeedStore, usePostStore } from '@/store';
import dayjs from 'dayjs';
import { memo } from 'react';

import Avatar from '@/components/avatar';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from '@/components/ui/context-menu';
import { cn } from '@/lib/utils';

function Post({ post, className }: { post: PostType; className?: string }) {
    const isSelected = usePostStore(state => state.selectedPostId === post.id);
    const updatePostReadById = usePostStore(state => state.updatePostReadById);
    const setSelectedPost = usePostStore(state => state.setSelectedPost);

    const setSelectFeed = useFeedStore(state => state.setSelectedFeedId);
    const feed = useFeedStore(state => state.feeds.find(f => f.id === post.feedId));

    const openLink = () => window.open(post.link, '_blank');

    if (!feed) return null;
    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>
                <div className={cn('bg-white p-4 select-none', { 'bg-gray-200': isSelected }, className)} onClick={() => setSelectedPost(post.id)} onDoubleClick={openLink}>
                    <h3 className="relative mb-2 flex items-center font-bold text-gray-800">
                        <span className="truncate" title={post.title}>
                            {post.title}
                        </span>
                        <span className={cn('absolute -left-3 size-1.5 rounded-full bg-orange-400', { hidden: post.isRead })}></span>
                    </h3>
                    <p className="line-clamp-2 text-sm text-gray-500">{post.summary}</p>
                    <div className="mt-1 flex text-xs text-gray-500">
                        <div className="flex items-center gap-x-1">
                            <Avatar title={feed.title} src={feed.icon} />
                            <span>{feed.title}</span>
                        </div>
                        <span className="mx-2">·</span>
                        <span>{dayjs(post.pubDate).format('YYYY-MM-DD')}</span>
                    </div>
                </div>
            </ContextMenuTrigger>
            <ContextMenuContent>
                <ContextMenuItem onSelect={() => updatePostReadById(post.id, !post.isRead)}>{post.isRead ? '标记为未读' : '标记为已读'}</ContextMenuItem>
                <ContextMenuItem onSelect={() => setSelectFeed(post.feedId)}>跳转至该订阅源</ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem onSelect={openLink}>在浏览器中打开文章</ContextMenuItem>
                <ContextMenuItem onSelect={() => navigator.clipboard.writeText(post.link)}>复制文章链接</ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    );
}

export default memo(Post);
