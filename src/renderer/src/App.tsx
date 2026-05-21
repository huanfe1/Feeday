import NiceModal from '@ebay/nice-modal-react';
import dayjs from 'dayjs';
import { useEffect } from 'react';
import { Toaster } from 'sonner';

import Sidebar from '@/components/sidebar';
import { ThemeProvider } from '@/components/theme-provider';
import { eventBus } from '@/lib/events';
import { cn } from '@/lib/utils';
import { useDragging } from '@/store/common';

import View from './view';

function App() {
    const isDragging = useDragging(state => state.isDragging);

    useEffect(() => {
        const remove = window.electron.ipcRenderer.on('refresh-feeds', () => {
            console.log('refresh-feeds', dayjs().format('YYYY-MM-DD HH:mm:ss'));
            eventBus.emit('refresh-posts', null);
            eventBus.emit('refresh-feeds', null);
        });
        return remove;
    }, []);

    return (
        <ThemeProvider defaultTheme="system" storageKey="feeday-theme">
            <NiceModal.Provider>
                <div className={cn('flex h-screen w-screen', isDragging ? 'cursor-ew-resize' : 'cursor-auto')}>
                    <Sidebar />
                    <View />
                </div>
                <Toaster toastOptions={{ style: { fontFamily: 'var(--font-custom)' } }} />
            </NiceModal.Provider>
        </ThemeProvider>
    );
}

export default App;
