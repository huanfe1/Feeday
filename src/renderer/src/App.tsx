import { useFeedStore, usePostStore } from '@/store';
import dayjs from 'dayjs';
import { useEffect, useRef } from 'react';
import { Toaster } from 'sonner';

import Sidebar from '@/components/sidebar';
import { cn } from '@/lib/utils';
import { useDragging } from '@/store/common';

import View from './view';

function App() {
    const isDragging = useDragging(state => state.isDragging);

    const feeds = useFeedStore(state => state.feeds);

    const refreshFeeds = useFeedStore(state => state.refreshFeeds);
    const refreshPosts = usePostStore(state => state.refreshPosts);

    const isDone = useRef(false);
    useEffect(() => {
        if (feeds.length === 0) return;

        if (isDone.current) return;
        isDone.current = true;

        window.electron.ipcRenderer.on('refresh-feed', () => {
            console.log('refresh-feed', dayjs().format('YYYY-MM-DD HH:mm:ss'));
            refreshFeeds();
            refreshPosts();
        });
    }, []);

    return (
        <>
            <div className={cn('flex h-screen w-screen', isDragging ? 'cursor-ew-resize' : 'cursor-auto')}>
                <Sidebar />
                <View />
            </div>
            <Toaster toastOptions={{ style: { fontFamily: 'var(--font-custom)' } }} />
        </>
    );
}

export default App;
