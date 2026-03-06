import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
                <HearderButton onClick={handleMinimize}>
                    <i className="i-mingcute-minimize-line" />
                </HearderButton>
                <HearderButton onClick={handleMaximize}>
                    <i className={cn(isMaximized ? 'i-mingcute-restore-line' : 'i-mingcute-square-line')}></i>
                </HearderButton>
                <HearderButton className="dark:hover:bg-destructive hover:bg-destructive hover:text-white" onClick={handleClose}>
                    <i className="i-mingcute-close-line" />
                </HearderButton>
            </div>
        </div>
    );
}

function HearderButton(props: React.ComponentProps<'button'>) {
    return <Button {...props} className={cn('w-[50px] rounded-none', props.className)} size="icon" variant="ghost" />;
}
