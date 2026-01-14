import { useFeedStore, usePostStore } from '@/store';
import { useEffect, useRef } from 'react';
import { Toaster, toast } from 'sonner';

import Sidebar from '@/components/sidebar';
import { cn } from '@/lib/utils';
import { useDragging } from '@/store/common';

import View from './view';

function App() {
    const { isDragging } = useDragging();
    const toastId = useRef<string | number>(null);

    const feeds = useFeedStore(state => state.feeds);

    const refreshFeeds = useFeedStore(state => state.refreshFeeds);
    const refreshPosts = usePostStore(state => state.refreshPosts);

    const isDone = useRef(false);
    useEffect(() => {
        if (feeds.length === 0) return;

        if (isDone.current) return;
        isDone.current = true;

        toast.promise(window.electron.ipcRenderer.invoke('refresh-feed-start'), {
            loading: '重新拉取订阅源信息中...',
            success: () => {
                refreshFeeds();
                refreshPosts();
                return '拉取成功';
            },
            error: (error: Error) => `拉取失败：${error.message}`,
        });

        window.electron.ipcRenderer.on('refresh-feed', (_, data) => {
            if (data.loading) {
                toastId.current = toast.loading('重新拉取订阅源信息中...');
            } else {
                if (!toastId.current) return;
                if (data.success) {
                    refreshFeeds();
                    refreshPosts();
                    toast.success('拉取成功', { id: toastId.current });
                } else {
                    toast.error('拉取失败：' + data.message, { id: toastId.current });
                }
            }
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
