import type { PostType } from '@/store';
import { useFeedStore, usePostStore } from '@/store';
import dayjs from 'dayjs';
import { memo } from 'react';
import sanitizeHtml from 'sanitize-html';

import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from '@/components/ui/context-menu';
import { cn, truncate } from '@/lib/utils';

function Post({ post }: { post: PostType }) {
    const isSelected = usePostStore(state => state.selectedPostId === post.id);
    const updatePostReadById = usePostStore(state => state.updatePostReadById);
    const setSelectedPost = usePostStore(state => state.setSelectedPost);

    const setSelectFeed = useFeedStore(state => state.setSelectedFeedId);

    const openLink = () => window.open(post.link, '_blank');

    return (
        <ContextMenu modal={false}>
            <ContextMenuTrigger asChild>
                <div
                    onClick={() => setSelectedPost(post.id)}
                    onDoubleClick={openLink}
                    className={cn('flex bg-white px-4 py-3 duration-200 select-none', { 'bg-gray-200': isSelected })}
                >
                    <div className="overflow-hidden">
                        <h3 className="relative mb-2 flex items-center font-bold text-gray-800">
                            <span className="truncate" title={post.title}>
                                {post.title}
                            </span>
                            <span className={cn('absolute -left-3 size-1.5 rounded-full bg-orange-400', { hidden: post.is_read })}></span>
                        </h3>
                        <p className="line-clamp-2 text-sm text-gray-500">{truncate(sanitizeHtml(post.summary, { allowedTags: [], allowedAttributes: {} }))}</p>
                        <div className="mt-1 space-x-2 text-xs text-gray-500">
                            <span>{post.author}</span>
                            <span>·</span>
                            <span>{dayjs(post.pub_date).format('YYYY-MM-DD')}</span>
                        </div>
                    </div>
                    {post.image_url && (
                        <div className="ml-2 flex max-w-18 flex-none items-center">
                            <img src={post.image_url} alt={post.title} className="h-auto w-full rounded-md" />
                        </div>
                    )}
                </div>
            </ContextMenuTrigger>
            <ContextMenuContent>
                <ContextMenuItem onSelect={() => updatePostReadById(post.id, !post.is_read)}>{post.is_read ? '标记为未读' : '标记为已读'}</ContextMenuItem>
                <ContextMenuItem onSelect={() => setSelectFeed(post.feed_id)}>跳转至该订阅源</ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem onSelect={openLink}>在浏览器中打开文章</ContextMenuItem>
                <ContextMenuItem onSelect={() => navigator.clipboard.writeText(post.link)}>复制文章链接</ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    );
}

export default memo(Post);
