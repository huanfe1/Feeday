import dayjs from 'dayjs';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { useResizable } from 'react-resizable-layout';
import sanitizeHtml from 'sanitize-html';

import { ScrollArea } from '@/components/ui/scroll-area';
import { useFeed, usePost } from '@/lib/store';
import { cn, truncate } from '@/lib/utils';

function PostsContent() {
    const [posts, setPosts] = useState<any[]>([]);

    const { feed } = useFeed();
    const { post: selectedPost, setPost, cancelPost } = usePost();

    useEffect(() => {
        if (feed.id) {
            window.electron.ipcRenderer.invoke('db-get-posts-by-id', Number(feed.id)).then(data => setPosts(data));
        } else {
            window.electron.ipcRenderer.invoke('db-get-posts').then(data => setPosts(data));
            cancelPost();
        }
    }, [feed]);

    return (
        <div className="flex h-full w-full flex-col overflow-y-hidden">
            <div className="drag-region flex h-[60px] flex-col items-center justify-center gap-4">
                <h3 className="text-lg font-bold">{feed.title || '文章列表'}</h3>
            </div>
            <AnimatePresence mode="wait">
                <motion.div
                    key={feed.id || 'all'}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.1, ease: 'easeIn' }}
                    className="w-full flex-1 overflow-y-hidden"
                >
                    <ScrollArea scrollKey={feed.id} className="flex h-full">
                        {posts.map(post => (
                            <div
                                onClick={() => setPost(post)}
                                onDoubleClick={() => window.open(post.link, '_blank')}
                                key={post.id}
                                className={cn('cursor-default bg-white p-4 duration-200 select-none', selectedPost.id === post.id ? 'bg-gray-200' : '')}
                            >
                                <h3 className="mb-2 truncate font-bold text-gray-800">{post.title}</h3>
                                <p className="line-clamp-2 text-sm text-gray-500">{truncate(sanitizeHtml(post.summary, { allowedTags: [], allowedAttributes: {} }))}</p>
                                <div className="mt-1 space-x-2 text-xs text-gray-500">
                                    <span>{post.author}</span>
                                    <span>·</span>
                                    <span>{dayjs(post.pub_date).format('YYYY-MM-DD')}</span>
                                </div>
                            </div>
                        ))}
                    </ScrollArea>
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
