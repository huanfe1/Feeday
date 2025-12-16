import { useEffect, useState } from 'react';

import { cn } from '../lib/utils';

export default function Header() {
    const [isMaximized, setIsMaximized] = useState(false);
    const handleClose = () => {
        window.electron.ipcRenderer.send('window-close');
    };
    const handleMaximize = () => {
        window.electron.ipcRenderer.send('window-maximize');
    };
    const handleMinimize = () => {
        window.electron.ipcRenderer.send('window-minimize');
    };

    useEffect(() => {
        const handleResize = () => {
            window.electron.ipcRenderer.invoke('get-window-state').then(data => setIsMaximized(data));
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    return (
        <div className="drag-region flex h-[35px] items-center justify-between bg-gray-100">
            <div className="pl-5">Feeday</div>
            <div className="no-drag-region flex h-full">
                <Button onClick={handleMinimize}>
                    <i className="i-mingcute-minimize-line" />
                </Button>
                <Button onClick={handleMaximize}>{isMaximized ? <i className="i-mingcute-restore-line" /> : <i className="i-mingcute-square-line" />}</Button>
                <Button onClick={handleClose} className="hover:bg-red-500 hover:text-white">
                    <i className="i-mingcute-close-line" />
                </Button>
            </div>
        </div>
    );
}

function Button({ children, onClick, className }: { children: React.ReactNode; onClick: () => void; className?: string }): React.JSX.Element {
    return (
        <button type="button" className={cn('pointer-events-auto flex h-full w-[50px] items-center justify-center duration-200 hover:bg-gray-300/75', className)} onClick={onClick}>
            {children}
        </button>
    );
}
