import { useEffect, useRef } from 'react';
import { useResizable } from 'react-resizable-layout';
import type { UseResizableProps } from 'react-resizable-layout';

import { useDragging } from '@/store/common';

function Resizable({ children, options }: { children: React.ReactNode; options: Omit<UseResizableProps, 'axis'> & { axis: 'x' } }) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const { position, separatorProps, isDragging } = useResizable({ containerRef: containerRef as React.RefObject<HTMLElement>, ...options });
    useEffect(() => useDragging.getState().setIsDragging(isDragging), [isDragging]);

    return (
        <>
            <div className="h-full" style={{ width: position }} ref={containerRef}>
                {children}
            </div>
            <div className="bg-secondary h-full w-[1.5px] cursor-ew-resize before:absolute before:h-full before:w-[5px] before:-translate-x-1/2" {...separatorProps} />
        </>
    );
}

export { Resizable };
