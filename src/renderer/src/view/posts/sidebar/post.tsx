import type { PostType } from '@/store';
import { useFeedStore, usePostStore } from '@/store';
import dayjs from 'dayjs';
import { memo, useCallback, useMemo } from 'react';
import sanitizeHtml from 'sanitize-html';

import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from '@/components/ui/context-menu';
import { cn, truncate } from '@/lib/utils';

function Post({ post }: { post: PostType }) {
    // 分别使用选择器，zustand v5中的函数引用是稳定的
    const updatePostReadById = usePostStore(state => state.updatePostReadById);
    const setCurrentPost = usePostStore(state => state.setCurrentPost);
    // 优化：直接计算isSelected，只有当currentPostId变化时才重新计算
    // 使用useMemo来稳定这个值，避免不必要的重新渲染
    const currentPostId = usePostStore(state => state.currentPostId);
    const isSelected = useMemo(() => currentPostId === post.id, [currentPostId, post.id]);
    const setSelectFeedFromFeedStore = useFeedStore(state => state.setSelectFeed);

    const onClick = useCallback(() => {
        setCurrentPost(post.id);
    }, [setCurrentPost, post.id]);

    const onDoubleClick = useCallback(() => {
        window.open(post.link, '_blank');
    }, [post.link]);

    const toggleReadStatus = useCallback(() => {
        updatePostReadById(post.id, !post.is_read);
    }, [updatePostReadById, post.id, post.is_read]);

    const handleSetSelectFeed = useCallback(() => {
        setSelectFeedFromFeedStore(post.feed_id);
    }, [setSelectFeedFromFeedStore, post.feed_id]);

    const handleOpenLink = useCallback(() => {
        window.open(post.link, '_blank');
    }, [post.link]);

    const handleCopyLink = useCallback(() => {
        navigator.clipboard.writeText(post.link);
    }, [post.link]);

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
                <ContextMenuItem onSelect={toggleReadStatus}>{post.is_read ? '标记为未读' : '标记为已读'}</ContextMenuItem>
                <ContextMenuItem onSelect={handleSetSelectFeed}>跳转至该订阅源</ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem onSelect={handleOpenLink}>在浏览器中打开文章</ContextMenuItem>
                <ContextMenuItem onSelect={handleCopyLink}>复制文章链接</ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    );
}

// 自定义比较函数，只有当post的关键属性变化时才重新渲染
export default memo(Post, (prevProps, nextProps) => {
    // 比较post对象的关键属性
    return (
        prevProps.post.id === nextProps.post.id &&
        prevProps.post.is_read === nextProps.post.is_read &&
        prevProps.post.title === nextProps.post.title &&
        prevProps.post.summary === nextProps.post.summary &&
        prevProps.post.author === nextProps.post.author &&
        prevProps.post.pub_date === nextProps.post.pub_date &&
        prevProps.post.link === nextProps.post.link
    );
});
