import dayjs from 'dayjs';
import parse from 'html-react-parser';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import sanitizeHtml from 'sanitize-html';

import { ScrollArea } from '@/components/ui/scroll-area';
import { usePost } from '@/lib/store';

export default function Post() {
    const [content, setContent] = useState('');
    const { post } = usePost();
    useEffect(() => {
        window.electron.ipcRenderer.invoke('db-get-post-content-by-id', Number(post.id)).then(data => setContent(sanitizeHtml(data?.content || data?.summary || '')));
    }, [post]);

    return (
        <div className="min-h-0 flex-1 overflow-y-hidden">
            <AnimatePresence mode="wait">
                {content && (
                    <motion.div
                        key={post.id}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.1, ease: 'easeIn' }}
                        className="h-full"
                    >
                        <ScrollArea className="h-full" scrollKey={post.id}>
                            <div className="prose max-w-none px-20 py-10">
                                <div className="border-border mb-8 border-b pb-6">
                                    <h1 className="text-foreground mb-4 text-2xl leading-tight font-bold">{post.title}</h1>
                                    <div className="text-muted-foreground flex items-center gap-4 text-sm">
                                        {post.author && (
                                            <div className="flex items-center gap-1.5">
                                                <i className="i-mingcute-user-3-line h-4 w-4" />
                                                <span>{post.author}</span>
                                            </div>
                                        )}
                                        {post.pub_date && (
                                            <div className="flex items-center gap-1.5">
                                                <i className="i-mingcute-calendar-time-add-line h-4 w-4" />
                                                <span>{dayjs(post.pub_date).format('YYYY-MM-DD')}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div>{parse(content)}</div>
                            </div>
                        </ScrollArea>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
