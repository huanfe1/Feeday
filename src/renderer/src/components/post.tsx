import dayjs from 'dayjs';
import parse from 'html-react-parser';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import sanitizeHtml from 'sanitize-html';

import { ScrollArea } from '@/components/ui/scroll-area';
import { usePost } from '@/lib/store';

export default function Post() {
    const [content, setContent] = useState('');
    const { currentPost } = usePost();
    useEffect(() => {
        if (!currentPost) return;
        window.electron.ipcRenderer.invoke('db-get-post-content-by-id', Number(currentPost.id)).then(data => setContent(sanitizeHtml(data?.content || data?.summary || '')));
    }, [currentPost]);

    return (
        <div className="min-h-0 flex-1 overflow-y-hidden">
            <AnimatePresence mode="wait">
                {content && (
                    <motion.div
                        key={currentPost?.id}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.1, ease: 'easeIn' }}
                        className="h-full"
                    >
                        {currentPost ? (
                            <ScrollArea className="h-full" scrollKey={currentPost.id}>
                                <div className="px-20 pt-5 pb-10">
                                    <div className="border-border mb-8 border-b pb-6">
                                        <a href={currentPost.link} target="_blank" className="text-foreground mb-3 block text-2xl leading-tight font-bold">
                                            {currentPost.title}
                                        </a>
                                        <div className="text-muted-foreground flex items-center gap-4 text-sm">
                                            {currentPost.author && (
                                                <div className="flex items-center gap-1.5">
                                                    <i className="i-mingcute-user-3-line h-4 w-4" />
                                                    <span>{currentPost.author}</span>
                                                </div>
                                            )}
                                            {currentPost.pub_date && (
                                                <div className="flex items-center gap-1.5">
                                                    <i className="i-mingcute-calendar-time-add-line h-4 w-4" />
                                                    <span>{dayjs(currentPost.pub_date).format('YYYY-MM-DD')}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="prose max-w-none">{parse(content)}</div>
                                </div>
                            </ScrollArea>
                        ) : (
                            <div className="flex h-full items-center justify-center text-gray-400 select-none">
                                <div className="flex flex-col items-center gap-y-3">
                                    <i className="i-mingcute-celebrate-line text-3xl"></i>
                                    <span>全部已读</span>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
