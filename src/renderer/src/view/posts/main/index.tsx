import { useFeedStore, usePostStore } from '@/store';
import type { AudioTrack } from '@/store';
import dayjs from 'dayjs';
import { AnimatePresence, motion } from 'motion/react';
import { memo, useEffect, useMemo, useState } from 'react';

import { PostAudio } from '@/components/audio/post';
import Avatar from '@/components/avatar';
import { Logo } from '@/components/icon';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { eventBus } from '@/lib/events';
import { cn, enterVariants } from '@/lib/utils';

import Render from './render';

function Main() {
    const [content, setContent] = useState('');

    const currentPost = usePostStore(state => state.getSelectedPost());
    const currentFeed = useFeedStore(state => state.feeds.find(f => f.id === currentPost?.feedId))!;

    const updatePostReadById = usePostStore(state => state.updatePostReadById);

    const [isScrolled, setIsScrolled] = useState(false);
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        setIsScrolled(e.currentTarget.scrollTop > 50);
    };

    const audio: AudioTrack | null = useMemo(() => {
        if (!currentPost?.podcast) return null;
        const parsed = JSON.parse(currentPost.podcast);

        parsed.image ??= currentPost.imageUrl;
        parsed.title ??= currentPost.title;

        return { postId: currentPost.id, feedId: currentPost.feedId, podcast: parsed };
    }, [currentPost]);

    useEffect(() => {
        if (!currentPost?.id) return;
        window.electron.ipcRenderer.invoke('db-get-post-content-by-id', Number(currentPost?.id)).then(data => {
            setContent(data?.content || data?.summary || '');
        });
        return () => setIsScrolled(false);
    }, [currentPost?.id]);

    const clickFeedHandle = (feedId: number, postId: number) => {
        eventBus.emit('jump-to-feed', { feedId, postId });
    };

    if (!currentPost)
        return (
            <div className="h-full overflow-hidden">
                <motion.div
                    className="flex h-full items-center justify-center text-gray-400 select-none"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                >
                    <div className="flex flex-col items-center gap-y-3">
                        <Logo className="size-25 opacity-50" />
                    </div>
                </motion.div>
            </div>
        );

    return (
        <div className="min-h-0 flex-1 overflow-y-hidden">
            <div className={cn('flex items-center justify-between px-5 pt-1 pb-2 text-lg font-bold', { 'border-b': isScrolled })}>
                <span className={cn('truncate opacity-0', { 'opacity-100': isScrolled })}>{currentPost.title}</span>
                <div className="flex-none space-x-1">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => updatePostReadById(currentPost.id, !currentPost.isRead)}>
                                <i className={cn('text-xl opacity-75', !currentPost.isRead ? 'i-mingcute-round-fill' : 'i-mingcute-round-line')}></i>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{currentPost.isRead ? '标记为未读' : '标记为已读'}</p>
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
                <motion.div className="h-full" key={currentPost?.id} {...enterVariants}>
                    <ScrollArea className="h-full" onScroll={handleScroll}>
                        <div className="mx-auto max-w-2xl px-8 pt-4 pb-12 2xl:max-w-4xl">
                            <article className="mb-12">
                                <header className="border-border mb-8 space-y-4 border-b pb-8">
                                    <h1>
                                        <a
                                            className="text-foreground block text-2xl leading-tight font-bold tracking-tight lg:text-3xl"
                                            href={currentPost.link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            {currentPost.title}
                                        </a>
                                    </h1>
                                    <div className="text-muted-foreground flex flex-wrap items-center gap-6 text-sm">
                                        <div className="flex cursor-pointer items-center gap-x-1" onClick={() => clickFeedHandle(currentFeed.id, currentPost.id)}>
                                            <Avatar src={currentFeed.icon} title={currentPost.title} />
                                            <span className="font-medium">{currentFeed.title}</span>
                                        </div>
                                        {currentPost.author && currentPost.author !== currentFeed.title && (
                                            <div className="flex items-center gap-2">
                                                <i className="i-mingcute-user-3-line size-4" />
                                                <span className="font-medium">{currentPost.author}</span>
                                            </div>
                                        )}
                                        {currentPost.pubDate && (
                                            <div className="flex items-center gap-2">
                                                <i className="i-mingcute-calendar-time-add-line size-4" />
                                                <time dateTime={currentPost.pubDate}>{dayjs(currentPost.pubDate).format('YYYY年MM月DD日')}</time>
                                            </div>
                                        )}
                                    </div>
                                </header>

                                {audio && audio?.podcast?.url && (
                                    <div className="mb-8">
                                        <PostAudio audio={audio} />
                                    </div>
                                )}

                                <div className="prose prose-img:mx-auto max-w-none">
                                    <Render content={content} audio={audio} />
                                </div>
                            </article>
                        </div>
                    </ScrollArea>
                </motion.div>
            </AnimatePresence>
        </div>
    );
}

export default memo(Main);
