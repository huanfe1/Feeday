import { memo, useEffect, useRef } from 'react';
import { useResizable } from 'react-resizable-layout';
import type { UseResizableProps } from 'react-resizable-layout';

import { useDragging } from '@/store/common';

type ResizableOptionsProps = Omit<UseResizableProps, 'axis' | 'initial'> & { axis: 'x'; initial: number };

function Resizable({ children, options, id }: { children: React.ReactNode; options: ResizableOptionsProps; id?: string }) {
    const containerRef = useRef<HTMLDivElement | null>(null);

    const storageValue = localStorage.getItem(`resizable:${id}`);
    const initial = id && storageValue ? Number(storageValue) : options.initial;

    const { position, separatorProps, isDragging, setPosition } = useResizable({ containerRef: containerRef as React.RefObject<HTMLElement>, ...options, initial });
    useEffect(() => useDragging.getState().setIsDragging(isDragging), [isDragging]);

    useEffect(() => {
        if (!id) return;
        localStorage.setItem(`resizable:${id}`, position.toString());
    }, [position, id]);

    return (
        <>
            <div className="h-full" style={{ width: position }} ref={containerRef}>
                {children}
            </div>
            <div
                className="bg-secondary h-full w-[1.5px] cursor-ew-resize before:absolute before:h-full before:w-[5px] before:-translate-x-1/2"
                {...separatorProps}
                onDoubleClick={() => setPosition(options.initial)}
            />
        </>
    );
}

export default memo(Resizable);
