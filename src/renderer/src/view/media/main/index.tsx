import { usePostStore } from '@/store';
import { memo } from 'react';

import { ScrollArea } from '@/components/ui/scroll-area';

function Main() {
    const mediaList = usePostStore(state => state.posts);

    if (mediaList.length === 0) return null;
    return (
        <ScrollArea className="min-h-0 flex-1 pt-3">
            <div className="grid grid-cols-3 gap-2 px-4 2xl:grid-cols-4">
                {mediaList.map(media => (
                    <div className="overflow-hidden rounded p-2 transition-colors hover:bg-gray-200" key={media.id} onDoubleClick={() => window.open(media.link, '_blank')}>
                        <div className="mt-2 truncate text-sm font-medium text-gray-600 select-none">{media.title}</div>
                    </div>
                ))}
            </div>
        </ScrollArea>
    );
}

export default memo(Main);
