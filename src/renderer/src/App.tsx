import dayjs from 'dayjs';
import { useEffect, useRef } from 'react';
import { Toaster, toast } from 'sonner';

import Sidebar from '@/components/sidebar';
import { cn } from '@/lib/utils';
import { useDragging } from '@/store/common';

import View from './view';

function App() {
    const { isDragging } = useDragging();
    const toastId = useRef<string | number>(null);

    const isDone = useRef(false);
    useEffect(() => {
        if (isDone.current) return;
        isDone.current = true;

        window.electron.ipcRenderer.on('refresh-feed', (_, data) => {
            if (data.loading) {
                toastId.current = toast.loading('重新拉取订阅源信息中...');
            } else {
                if (!toastId.current) return;
                if (data.success) {
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
