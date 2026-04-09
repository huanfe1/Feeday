import { usePostStore } from '@/store';
import type { AudioTrack } from '@/store';
import type { PostDetail } from '@shared/types/database';
import dayjs from 'dayjs';
import { AnimatePresence, motion } from 'motion/react';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import useSWR from 'swr';

import { PostAudio } from '@/components/audio/post';
import Avatar from '@/components/avatar';
import { Logo } from '@/components/icon';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { eventBus } from '@/lib/events';
import { cn, enterVariants } from '@/lib/utils';

import Render from './render';

const fetcher = ([_channel, postId]: readonly [string, number | null]): Promise<PostDetail | null> =>
    postId != null ? window.electron.ipcRenderer.invoke('db-get-post-by-id', postId) : Promise.resolve(null);

function Main() {
    const selectedPostId = usePostStore(state => state.selectedPostId);

    const [isScrolled, setIsScrolled] = useState(false);
    const scrollViewRef = useRef<HTMLDivElement>(null);

    const { data: post, mutate } = useSWR<PostDetail | null>(['db-get-post-by-id', selectedPostId], fetcher);

    const audio: AudioTrack | null = useMemo(() => {
        if (!post?.podcast) return null;

        post.podcast.image ??= post.imageUrl ?? undefined;
        post.podcast.title ??= post.title;

        return { postId: post.id, feedId: post.feedId, podcast: post?.podcast };
    }, [post]);

    useEffect(() => setIsScrolled(false), [selectedPostId]);

    const handleFeedClick = (feedId: number, postId: number) => {
        eventBus.emit('jump-to-feed', { feedId, postId });
    };

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        setIsScrolled(e.currentTarget.scrollTop > 50);
    };

    const handleScrollToTop = () => {
        scrollViewRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleUpdatePostReadById = () => {
        if (!post?.id) return;
        usePostStore.getState().updatePostReadById(post?.id, !post?.isRead);
        mutate({ ...post, isRead: !post?.isRead }, false);
    };

    if (!post) {
        return (
            <div className="h-full overflow-hidden">
                <motion.div className="text-muted-foreground flex h-full items-center justify-center select-none" {...enterVariants}>
                    <div className="flex flex-col items-center gap-y-3">
                        <Logo className="size-25 opacity-50" />
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="flex flex-col overflow-hidden">
            <div className={cn('flex flex-none items-center justify-between px-2 pb-2 text-lg font-bold', { 'border-b': isScrolled })}>
                <span className={cn('truncate opacity-0 transition-opacity', { 'opacity-100': isScrolled })}>{post.title}</span>
                <div className="flex-none space-x-1">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button onClick={handleUpdatePostReadById} size="icon" variant="ghost">
                                <i className={cn('text-xl opacity-75', !post.isRead ? 'i-mingcute-round-fill' : 'i-mingcute-round-line')}></i>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                            <p>{post.isRead ? '标记为未读' : '标记为已读'}</p>
                        </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button onClick={() => window.open(post.link, '_blank')} size="icon" variant="ghost">
                                <i className="i-mingcute-world-2-line text-xl opacity-75"></i>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                            <p>在浏览器中打开</p>
                        </TooltipContent>
                    </Tooltip>
                </div>
            </div>
            <div className="relative min-h-0 grow">
                <ScrollArea className="h-full" key={post.id} onScroll={handleScroll} viewportRef={scrollViewRef}>
                    <AnimatePresence mode="wait">
                        <motion.div className="mx-auto max-w-2xl px-8 pt-4 pb-4 2xl:max-w-4xl" {...enterVariants}>
                            <article className="mb-12">
                                <header className="border-border mb-8 space-y-4 border-b pb-8">
                                    <h1>
                                        <a
                                            className="text-foreground block text-2xl leading-tight font-bold tracking-tight lg:text-3xl"
                                            href={post.link}
                                            rel="noopener noreferrer"
                                            target="_blank"
                                        >
                                            {post.title}
                                        </a>
                                    </h1>
                                    <div className="text-muted-foreground flex flex-wrap items-center gap-6 text-sm">
                                        <div
                                            className="flex cursor-pointer items-center gap-x-1"
                                            onClick={() => post.feedId != null && post.id != null && handleFeedClick(post.feedId, post.id)}
                                        >
                                            <Avatar defaultAvatarUrl={post.feedIcon ?? undefined} domain={post.feedLink} title={post.feedTitle} />
                                            <span className="font-medium">{post.feedTitle}</span>
                                        </div>
                                        {post.author && post.author !== post.feedTitle && (
                                            <div className="flex items-center gap-2">
                                                <i className="i-mingcute-user-3-line size-4" />
                                                <span className="font-medium">{post.author}</span>
                                            </div>
                                        )}
                                        {post.pubDate && (
                                            <div className="flex items-center gap-2">
                                                <i className="i-mingcute-calendar-time-add-line size-4" />
                                                <time dateTime={post.pubDate}>{dayjs(post.pubDate).format('YYYY年MM月DD日')}</time>
                                            </div>
                                        )}
                                    </div>
                                </header>

                                {audio && audio?.podcast?.url && (
                                    <div className="mb-8">
                                        <PostAudio audio={audio} />
                                    </div>
                                )}

                                <div className="prose dark:prose-invert prose-img:mx-auto max-w-none">
                                    <Render audio={audio} content={post.content} />
                                </div>
                            </article>
                        </motion.div>
                    </AnimatePresence>
                </ScrollArea>
                <AnimatePresence>
                    {isScrolled && (
                        <motion.div
                            className="absolute right-10 bottom-14 z-10"
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            initial={{ opacity: 0, scale: 0.8 }}
                            transition={{ duration: 0.2 }}
                        >
                            <Button className="size-10 rounded-full" onClick={handleScrollToTop} size="icon" variant="outline">
                                <i className="i-mingcute-arrow-to-up-line text-lg" />
                            </Button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

export default memo(Main);
