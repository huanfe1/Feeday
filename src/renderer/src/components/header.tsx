import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

import { cn } from '../lib/utils';

export default function Header() {
    const [isMaximized, setIsMaximized] = useState(false);

    const handleClose = () => window.electron.ipcRenderer.send('window-close');
    const handleMaximize = () => window.electron.ipcRenderer.send('window-maximize');
    const handleMinimize = () => window.electron.ipcRenderer.send('window-minimize');

    useEffect(() => {
        const handleResize = () => {
            window.electron.ipcRenderer.invoke('get-window-state').then(data => setIsMaximized(data));
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    return (
        <div className="drag-region flex h-[35px] flex-none items-center justify-end">
            <div className="no-drag-region flex h-full">
                <Button onClick={handleMinimize}>
                    <i className="i-mingcute-minimize-line" />
                </Button>
                <Button onClick={handleMaximize}>
                    <i className={cn(isMaximized ? 'i-mingcute-restore-line' : 'i-mingcute-square-line')}></i>
                </Button>
                <Button className="hover:bg-red-500 hover:text-white" onClick={handleClose}>
                    <i className="i-mingcute-close-line" />
                </Button>
            </div>
        </div>
    );
}

function Button({ children, onClick, className }: { children: ReactNode; onClick: () => void; className?: string }) {
    return (
        <button className={cn('pointer-events-auto flex h-full w-[50px] items-center justify-center duration-200 hover:bg-gray-300/70', className)} type="button" onClick={onClick}>
            {children}
        </button>
    );
}
