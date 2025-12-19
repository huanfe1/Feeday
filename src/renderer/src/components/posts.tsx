import dayjs from 'dayjs';
import { useEffect, useRef, useState } from 'react';
import { useResizable } from 'react-resizable-layout';

import { ScrollArea } from '@/components/ui/scroll-area';
import { useFeed } from '@/lib/store';

function PostsContent() {
    const [posts, setPosts] = useState<any[]>([]);

    const { feed } = useFeed();

    useEffect(() => {
        window.electron.ipcRenderer.invoke('db-get-posts-by-id', Number(feed.id)).then(data => {
            setPosts(data);
        });
    }, [feed]);

    return (
        <div className="flex h-full w-full flex-col">
            <div className="drag-region flex h-[60px] flex-col items-center justify-center gap-4">
                <h3 className="text-lg font-bold">文章列表</h3>
            </div>
            <div className="w-full flex-1 overflow-y-auto">
                <ScrollArea scrollKey={feed.id} className="flex h-full [&_[data-slot=scroll-area-viewport]>div]:block!">
                    <div>
                        {posts.map(post => (
                            <div key={post.id} className="w-full cursor-default rounded-lg bg-white p-4 duration-200">
                                <h3 className="mb-2 truncate font-bold text-gray-800">{post.title}</h3>
                                <p className="line-clamp-2 text-sm text-gray-500">{post.summary}</p>
                                <div className="mt-1 space-x-2 text-xs text-gray-500">
                                    <span>{feed.title}</span>
                                    <span>{dayjs(post.pubDate).format('YYYY-MM-DD')}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
}

export default function Posts({ setIsDragging }: { setIsDragging: (isDragging: boolean) => void }) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const { position, separatorProps, isDragging } = useResizable({ axis: 'x', min: 300, max: 400, initial: 300, containerRef: containerRef as React.RefObject<HTMLElement> });
    useEffect(() => setIsDragging(isDragging), [isDragging]);

    return (
        <>
            <div className="h-full overflow-y-auto" style={{ width: position }} ref={containerRef}>
                <PostsContent />
            </div>
            <div className="bg-secondary h-full w-[1.5px] cursor-ew-resize before:absolute before:h-full before:w-[5px] before:-translate-x-1/2" {...separatorProps} />
        </>
    );
}
