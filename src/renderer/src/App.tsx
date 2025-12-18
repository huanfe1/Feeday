import { useState } from 'react';
import { useResizable } from 'react-resizable-layout';
import { Toaster } from 'sonner';

import Header from '@/components/header';
import SidebarHeader from '@/components/sidebar/header';

import { cn } from './lib/utils';

function App() {
    const [isResizing, setIsResizing] = useState(false);
    const { position, separatorProps } = useResizable({
        axis: 'x',
        min: 200,
        max: 400,
        initial: 250,
        onResizeStart: () => {
            setIsResizing(true);
        },
        onResizeEnd: () => {
            setIsResizing(false);
        },
    });

    // const handleInsertFeed = () => {
    //     window.electron.ipcRenderer
    //         .invoke('db-insert-feed', {
    //             title: 'Test',
    //             htmlUrl: 'https://example.com2',
    //             xmlUrl: 'https://example.com/feed.xml2',
    //         })
    //         .then(result => {
    //             console.log(result);
    //         });
    // };
    return (
        <>
            <div className={cn('flex h-screen w-full', isResizing ? 'cursor-ew-resize' : 'cursor-auto')}>
                <div className="h-full" style={{ width: position }}>
                    <SidebarHeader />
                </div>
                <div className="bg-secondary h-full w-[1.5px] cursor-ew-resize before:absolute before:h-full before:w-[5px] before:-translate-x-1/2" {...separatorProps}></div>
                <div className="h-full flex-1">
                    <Header />
                </div>
            </div>
            <Toaster toastOptions={{ style: { fontFamily: 'var(--font-custom)' } }} />
        </>
    );
}

export default App;
