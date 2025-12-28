import dayjs from 'dayjs';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { useResizable } from 'react-resizable-layout';
import sanitizeHtml from 'sanitize-html';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useFeed, usePost } from '@/lib/store';
import { cn, truncate } from '@/lib/utils';

function PostsContent() {
    const [posts, setPosts] = useState<any[]>([]);
    const [onlyUnread, setOnlyUnread] = useState<boolean>(false);

    const { feed } = useFeed();
    const { post: selectedPost, setPost, cancelPost } = usePost();

    const clickPost = (post: any) => {
        setPost(post);
        window.electron.ipcRenderer.invoke('db-update-read-post-by-id', Number(post.id), true);
        post.is_read = true;
    };

    const loadPosts = () => {
        if (feed.id) {
            window.electron.ipcRenderer.invoke('db-get-posts-by-id', Number(feed.id), onlyUnread).then(data => setPosts(data));
        } else {
            window.electron.ipcRenderer.invoke('db-get-posts', onlyUnread).then(data => setPosts(data));
        }
    };

    const readAllPosts = () => {
        console.log(feed.id && Number(feed.id));
        window.electron.ipcRenderer.invoke('db-read-all-posts', feed.id && Number(feed.id));
        loadPosts();
    };

    useEffect(() => {
        loadPosts();
        window.addEventListener('refresh-posts', loadPosts);
        return () => window.removeEventListener('refresh-posts', loadPosts);
    }, [feed, onlyUnread]);

    return (
        <div className="flex h-full w-full flex-col overflow-y-hidden">
            <div className="drag-region mx-4 flex h-[60px] items-center justify-between gap-4">
                <h3 className="text-lg font-bold">{feed.title || '文章列表'}</h3>
                <span className="space-x-1 text-xl text-gray-500">
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
                            <p>{onlyUnread ? '全部' : '已读'}</p>
                        </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={readAllPosts}>
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
                    key={`${feed.id || 'all'}-${onlyUnread ? 'unread' : 'all'}`}
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
                        <ScrollArea scrollKey={feed.id} className="flex h-full">
                            {posts.map(post => (
                                <div
                                    onClick={() => clickPost(post)}
                                    onDoubleClick={() => window.open(post.link, '_blank')}
                                    key={post.id}
                                    className={cn('cursor-default bg-white p-4 duration-200 select-none', selectedPost.id === post.id ? 'bg-gray-200' : '')}
                                >
                                    <h3 className="relative mb-2 flex items-center font-bold text-gray-800">
                                        <span className="truncate">{post.title}</span>
                                        <span className={cn('absolute -left-3 size-1.5 rounded-full bg-orange-400', { hidden: post.is_read })}></span>
                                    </h3>
                                    <p className="line-clamp-2 text-sm text-gray-500">{truncate(sanitizeHtml(post.summary, { allowedTags: [], allowedAttributes: {} }))}</p>
                                    <div className="mt-1 space-x-2 text-xs text-gray-500">
                                        <span>{post.author}</span>
                                        <span>·</span>
                                        <span>{dayjs(post.pub_date).format('YYYY-MM-DD')}</span>
                                    </div>
                                </div>
                            ))}
                        </ScrollArea>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}

export default function Posts({ setIsDragging }: { setIsDragging: (isDragging: boolean) => void }) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const { position, separatorProps, isDragging } = useResizable({ axis: 'x', min: 300, max: 400, initial: 300, containerRef: containerRef as React.RefObject<HTMLElement> });
    useEffect(() => setIsDragging(isDragging), [isDragging]);

    return (
        <>
            <div className="h-full flex-none overflow-y-auto" style={{ width: position }} ref={containerRef}>
                <PostsContent />
            </div>
            <div className="bg-secondary h-full w-[1.5px] cursor-ew-resize before:absolute before:h-full before:w-[5px] before:-translate-x-1/2" {...separatorProps} />
        </>
    );
}
