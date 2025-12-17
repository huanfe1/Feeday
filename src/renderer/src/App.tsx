import { useState } from 'react';
import { useResizable } from 'react-resizable-layout';

import Header from '@/components/header';

import { Button } from './components/ui/button';
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
    return (
        <>
            <div className={cn('flex h-screen w-full', isResizing ? 'cursor-ew-resize' : 'cursor-auto')}>
                <div className="h-full" style={{ width: position }}>
                    <div className="drag-region flex h-[60px] justify-between px-3">
                        <div className="flex items-center gap-1">
                            <i className="i-mingcute-follow-fill text-4xl text-[#FF5C00]"></i>
                            <span className="font-bold">Folo</span>
                        </div>
                        <div className="no-drag-region flex items-center">
                            <Button variant="ghost" size="icon">
                                <i className="i-mingcute-add-fill text-base"></i>
                            </Button>
                        </div>
                    </div>
                </div>
                <div className="bg-secondary h-full w-[1.5px] cursor-ew-resize before:absolute before:h-full before:w-[5px] before:-translate-x-1/2" {...separatorProps}></div>
                <div className="h-full flex-1">
                    <Header />
                </div>
            </div>
        </>
    );
}

export default App;
