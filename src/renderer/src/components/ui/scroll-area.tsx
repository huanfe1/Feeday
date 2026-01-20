import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area';
import * as React from 'react';

import { cn } from '@/lib/utils';

interface ScrollAreaProps extends React.ComponentProps<typeof ScrollAreaPrimitive.Root> {
    scrollKey?: string | number;
}

const ScrollArea = ({ className, children, scrollKey, onScroll, onClick, ...props }: ScrollAreaProps) => {
    const rootRef = React.useRef<HTMLDivElement>(null);
    const viewportRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (viewportRef.current && scrollKey !== undefined) {
            viewportRef.current.scrollTop = 0;
        }
    }, [scrollKey]);

    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === viewportRef.current) {
            e.target = rootRef.current!;
        }
        onClick && onClick(e);
    };

    return (
        <ScrollAreaPrimitive.Root
            className={cn('relative [&_[data-slot=scroll-area-viewport]>div]:block!', className)}
            ref={rootRef}
            scrollHideDelay={0}
            data-slot="scroll-area"
            onClick={handleClick}
            {...props}
        >
            <ScrollAreaPrimitive.Viewport
                className="focus-visible:ring-ring/50 size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:outline-1"
                data-slot="scroll-area-viewport"
                onScroll={onScroll}
                ref={viewportRef}
            >
                {children}
            </ScrollAreaPrimitive.Viewport>
            <ScrollBar />
            <ScrollAreaPrimitive.Corner />
        </ScrollAreaPrimitive.Root>
    );
};

function ScrollBar({ className, orientation = 'vertical', ...props }: React.ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>) {
    return (
        <ScrollAreaPrimitive.ScrollAreaScrollbar
            className={cn(
                'flex touch-none p-px transition-colors select-none',
                orientation === 'vertical' && 'h-full w-2 border-l border-l-transparent',
                orientation === 'horizontal' && 'h-2.5 flex-col border-t border-t-transparent',
                className,
            )}
            data-slot="scroll-area-scrollbar"
            orientation={orientation}
            {...props}
        >
            <ScrollAreaPrimitive.ScrollAreaThumb className="bg-border relative flex-1 rounded-full" data-slot="scroll-area-thumb" />
        </ScrollAreaPrimitive.ScrollAreaScrollbar>
    );
}

export { ScrollArea, ScrollBar };
