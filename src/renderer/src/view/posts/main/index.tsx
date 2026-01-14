import { useFeedStore, usePostStore } from '@/store';
import dayjs from 'dayjs';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

import Render from './render';

export default function Main() {
    const [content, setContent] = useState('');

    const setSelectFeed = useFeedStore(state => state.setSelectFeed);

    const currentPostId = usePostStore(state => state.currentPostId);
    const posts = usePostStore(state => state.posts);
    const updatePostReadById = usePostStore(state => state.updatePostReadById);

    // 使用 useMemo 基于 currentPostId 和 posts 计算 currentPost
    const currentPost = useMemo(() => {
        if (!currentPostId) return null;
        return posts.find(post => post.id === currentPostId) || null;
    }, [currentPostId, posts]);

    const [isScrolled, setIsScrolled] = useState(false);
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        setIsScrolled(e.currentTarget.scrollTop > 50);
    };

    useEffect(() => {
        if (!currentPostId) return;
        window.electron.ipcRenderer.invoke('db-get-post-content-by-id', Number(currentPostId)).then(data => {
            setContent(data?.content || data?.summary || '');
        });
        return () => setIsScrolled(false);
    }, [currentPostId]);

    if (!currentPost)
        return (
            <div className="flex h-full items-center justify-center text-gray-400 select-none">
                <div className="flex flex-col items-center gap-y-3">
                    <i className="i-mingcute-follow-fill text-[60px] opacity-50"></i>
                </div>
            </div>
        );

    return (
        <div className="min-h-0 flex-1 overflow-y-hidden">
            <div className={cn('flex items-center justify-between px-5 pt-1 pb-2 text-lg font-bold', { 'border-b': isScrolled })}>
                <span className={cn('truncate opacity-0', { 'opacity-100': isScrolled })}>{currentPost.title}</span>
                <div className="flex-none space-x-1">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => updatePostReadById(currentPost.id, !currentPost.is_read)}>
                                <i className={cn('text-xl opacity-75', !currentPost.is_read ? 'i-mingcute-round-fill' : 'i-mingcute-round-line')}></i>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{currentPost.is_read ? '标记为未读' : '标记为已读'}</p>
                        </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => window.open(currentPost.link, '_blank')}>
                                <i className="i-mingcute-world-2-line text-xl opacity-75"></i>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>在浏览器中打开</p>
                        </TooltipContent>
                    </Tooltip>
                </div>
            </div>
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentPost?.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="h-full"
                >
                    <ScrollArea onScroll={handleScroll} className="h-full" scrollKey={currentPost.id}>
                        <div className="mx-auto max-w-2xl px-8 pt-4 pb-12 2xl:max-w-4xl">
                            <article className="mb-12">
                                <header className="border-border mb-8 space-y-4 border-b pb-8">
                                    <h1>
                                        <a
                                            href={currentPost.link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-foreground block text-2xl leading-tight font-bold tracking-tight lg:text-3xl"
                                        >
                                            {currentPost.title}
                                        </a>
                                    </h1>
                                    <div className="text-muted-foreground flex flex-wrap items-center gap-6 text-sm">
                                        {currentPost.author && (
                                            <div className="flex cursor-pointer items-center gap-2" onClick={() => setSelectFeed(currentPost.feed_id)}>
                                                <i className="i-mingcute-user-3-line h-4 w-4" />
                                                <span className="font-medium">{currentPost.author}</span>
                                            </div>
                                        )}
                                        {currentPost.pub_date && (
                                            <div className="flex items-center gap-2">
                                                <i className="i-mingcute-calendar-time-add-line h-4 w-4" />
                                                <time dateTime={currentPost.pub_date}>{dayjs(currentPost.pub_date).format('YYYY年MM月DD日')}</time>
                                            </div>
                                        )}
                                    </div>
                                </header>

                                <div className="prose max-w-none">
                                    <Render content={content} />
                                </div>
                            </article>
                        </div>
                    </ScrollArea>
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
