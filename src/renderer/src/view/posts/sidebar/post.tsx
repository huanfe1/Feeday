import type { PostType } from '@/store';
import { useFeedStore, usePostStore } from '@/store';
import dayjs from 'dayjs';
import sanitizeHtml from 'sanitize-html';

import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from '@/components/ui/context-menu';
import { cn, truncate } from '@/lib/utils';

export default function Post({ post, isSelected, onClick, onDoubleClick }: { post: PostType; isSelected: boolean; onClick: () => void; onDoubleClick: () => void }) {
    const updatePostReadById = usePostStore(state => state.updatePostReadById);

    const setSelectFeed = useFeedStore(state => state.setSelectFeed);

    const toggleReadStatus = () => {
        updatePostReadById(post.id, !post.is_read);
    };

    return (
        <ContextMenu modal={false}>
            <ContextMenuTrigger asChild>
                <div onClick={onClick} onDoubleClick={onDoubleClick} className={cn('bg-white p-4 duration-200 select-none', isSelected ? 'bg-gray-200' : '')}>
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
            </ContextMenuTrigger>
            <ContextMenuContent>
                <ContextMenuItem onSelect={() => toggleReadStatus()}>{post.is_read ? '标记为未读' : '标记为已读'}</ContextMenuItem>
                <ContextMenuItem onSelect={() => setSelectFeed(post.feed_id)}>跳转至该订阅源</ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem onSelect={() => window.open(post.link, '_blank')}>在浏览器中打开文章</ContextMenuItem>
                <ContextMenuItem onSelect={() => navigator.clipboard.writeText(post.link)}>复制文章链接</ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    );
}
