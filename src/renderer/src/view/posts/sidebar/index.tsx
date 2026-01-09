import { useFeedStore, usePostStore } from '@/store';
import dayjs from 'dayjs';
import { AnimatePresence, motion } from 'motion/react';
import { memo, useCallback, useEffect, useState } from 'react';
import sanitizeHtml from 'sanitize-html';

import { Resizable } from '@/components/resizable';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn, truncate } from '@/lib/utils';

// Memoized post item component to prevent unnecessary re-renders
const PostItem = memo(function PostItem({
    post,
    isSelected,
    onClick,
    onDoubleClick,
}: {
    post: { id: number; title: string; summary: string; author: string; pub_date: string; is_read: boolean };
    isSelected: boolean;
    onClick: () => void;
    onDoubleClick: () => void;
}) {
    return (
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
    );
});

export default function Sidebar() {
    const [onlyUnread, setOnlyUnread] = useState<boolean>(false);

    const selectFeed = useFeedStore(state => state.getSelectFeed());
    const { posts, currentPost, setCurrentPost, refreshPosts, readAllPosts } = usePostStore();

    const clickPost = useCallback((post_id: number) => setCurrentPost(post_id), [setCurrentPost]);

    const loadPosts = useCallback(() => refreshPosts(selectFeed?.id, onlyUnread), [selectFeed?.id, onlyUnread, refreshPosts]);
    useEffect(() => loadPosts(), [loadPosts]);

    return (
        <Resizable options={{ axis: 'x', min: 300, max: 400, initial: 300 }}>
            <div className="flex h-full w-full flex-col overflow-y-hidden">
                <div className="drag-region mx-4 flex h-[60px] items-center justify-between gap-4">
                    <h3 className="truncate text-lg font-bold">{selectFeed?.title || '文章列表'}</h3>
                    <span className="flex-none space-x-1 text-xl text-gray-500">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" className="" size="icon" onClick={loadPosts}>
                                    <motion.i
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 0.5, ease: 'easeInOut' }}
                                        whileHover={{ rotate: 0 }}
                                        className="i-mingcute-refresh-2-line text-xl opacity-75"
                                    />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>刷新</p>
                            </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => setOnlyUnread(!onlyUnread)}>
                                    <i className={cn('text-xl opacity-75', onlyUnread ? 'i-mingcute-round-fill' : 'i-mingcute-round-line')}></i>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{onlyUnread ? '显示全部' : '只显示已读'}</p>
                            </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => readAllPosts(selectFeed?.id)}>
                                    <i className="i-mingcute-check-circle-line text-xl opacity-75"></i>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>全部标为已读</p>
                            </TooltipContent>
                        </Tooltip>
                    </span>
                </div>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={`${selectFeed?.id || 'all'}-${onlyUnread ? 'unread' : 'all'}`}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.1, ease: 'easeIn' }}
                        className="w-full flex-1 overflow-y-hidden"
                    >
                        {posts.length === 0 ? (
                            <div className="flex h-full items-center justify-center text-gray-400 select-none">
                                <div className="flex flex-col items-center gap-y-3">
                                    <i className="i-mingcute-celebrate-line text-3xl"></i>
                                    <span>全部已读</span>
                                </div>
                            </div>
                        ) : (
                            <ScrollArea scrollKey={selectFeed?.id} className="flex h-full">
                                {posts.map(post => (
                                    <PostItem
                                        key={post.id}
                                        post={post}
                                        isSelected={currentPost?.id === post.id}
                                        onClick={() => clickPost(post.id)}
                                        onDoubleClick={() => window.open(post.link, '_blank')}
                                    />
                                ))}
                            </ScrollArea>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </Resizable>
    );
}
