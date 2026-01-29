import type { PostType } from '@/store';
import { useFeedStore } from '@/store';
import dayjs from 'dayjs';
import { memo, useMemo } from 'react';

import Avatar from '@/components/avatar';
import { cn } from '@/lib/utils';

function Render({ media }: { media: PostType }) {
    const feed = useFeedStore(state => state.feeds.find(f => f.id === media.feed_id));

    const imgUrl = useMemo(() => {
        if (media.link.startsWith('https://www.youtube.com/watch?v=')) {
            return media.image_url.replace(new URL(media.image_url).search, '');
        }
        return media.image_url;
    }, [media.image_url, media.link]);

    if (!feed) return null;
    return (
        <div className="relative rounded p-2 select-none hover:bg-gray-200" key={media.id} onDoubleClick={() => window.open(media.link, '_blank')}>
            <div className="flex aspect-video items-center overflow-hidden rounded bg-gray-100">
                <img className="w-full" src={imgUrl} alt={media.title} loading="lazy" />
            </div>
            <div className="mt-2 truncate text-sm font-medium text-gray-600">{media.title}</div>
            <div className="mt-1 flex text-xs text-gray-600">
                <Avatar title={feed.title} src={feed.icon} />
                <span className="ml-1 truncate">{feed.title}</span>
                <span className="ml-3 flex-none text-gray-400">{dayjs(media.pub_date).format('YYYY-MM-DD')}</span>
            </div>
            <span className={cn('absolute -top-0.5 -left-0.5 size-2 rounded-full bg-orange-400', { hidden: media.is_read })}></span>
        </div>
    );
}

export default memo(Render);
