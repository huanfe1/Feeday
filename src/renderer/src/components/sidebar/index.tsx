import { useEffect } from 'react';
import { useResizable } from 'react-resizable-layout';

import { Separator } from '@/components/ui/separator';

import AddFeed from './addFeed';
import Feeds from './feeds';

function Content() {
    return (
        <div className="bg-sidebar flex h-full flex-col">
            <div className="drag-region flex h-[60px] justify-between px-3">
                <div className="flex items-center gap-1">
                    <i className="i-mingcute-follow-fill text-4xl text-[#FF5C00]" />
                    <span className="font-bold">Folo</span>
                </div>
                <div className="no-drag-region flex items-center">
                    <AddFeed />
                </div>
            </div>
            <Separator />
            <Feeds />
        </div>
    );
}

export default function Sidebar({ setIsDragging }: { setIsDragging: (isDragging: boolean) => void }) {
    const { position, separatorProps, isDragging } = useResizable({ axis: 'x', min: 200, max: 300, initial: 250 });
    useEffect(() => setIsDragging(isDragging), [isDragging]);
    return (
        <>
            <div className="h-full" style={{ width: position }}>
                <Content />
            </div>
            <div className="bg-secondary h-full w-[1.5px] cursor-ew-resize before:absolute before:h-full before:w-[5px] before:-translate-x-1/2" {...separatorProps} />
        </>
    );
}
