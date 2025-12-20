import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area';
import * as React from 'react';

import { cn } from '@/lib/utils';

interface ScrollAreaProps extends React.ComponentProps<typeof ScrollAreaPrimitive.Root> {
    scrollKey?: string | number;
}

const ScrollArea = React.forwardRef<HTMLDivElement, ScrollAreaProps>(({ className, children, scrollKey, ...props }, ref) => {
    const internalRef = React.useRef<HTMLDivElement>(null);
    const combinedRef = React.useCallback(
        (node: HTMLDivElement | null) => {
            internalRef.current = node;
            if (typeof ref === 'function') {
                ref(node);
            } else if (ref) {
                ref.current = node;
            }
        },
        [ref],
    );

    // 当 scrollKey 变化时，重置滚动位置到顶部
    React.useEffect(() => {
        if (internalRef.current && scrollKey !== undefined) {
            const viewport = internalRef.current.querySelector('[data-radix-scroll-area-viewport]') || internalRef.current.querySelector('[data-slot="scroll-area-viewport"]');
            if (viewport) {
                (viewport as HTMLElement).scrollTop = 0;
            }
        }
    }, [scrollKey]);

    return (
        <ScrollAreaPrimitive.Root
            ref={combinedRef}
            scrollHideDelay={0}
            data-slot="scroll-area"
            className={cn('relative [&_[data-slot=scroll-area-viewport]>div]:block!', className)}
            {...props}
        >
            <ScrollAreaPrimitive.Viewport
                data-slot="scroll-area-viewport"
                className="focus-visible:ring-ring/50 size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:outline-1"
            >
                {children}
            </ScrollAreaPrimitive.Viewport>
            <ScrollBar />
            <ScrollAreaPrimitive.Corner />
        </ScrollAreaPrimitive.Root>
    );
});
ScrollArea.displayName = 'ScrollArea';

function ScrollBar({ className, orientation = 'vertical', ...props }: React.ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>) {
    return (
        <ScrollAreaPrimitive.ScrollAreaScrollbar
            data-slot="scroll-area-scrollbar"
            orientation={orientation}
            className={cn(
                'flex touch-none p-px transition-colors select-none',
                orientation === 'vertical' && 'h-full w-2 border-l border-l-transparent',
                orientation === 'horizontal' && 'h-2.5 flex-col border-t border-t-transparent',
                className,
            )}
            {...props}
        >
            <ScrollAreaPrimitive.ScrollAreaThumb data-slot="scroll-area-thumb" className="bg-border relative flex-1 rounded-full" />
        </ScrollAreaPrimitive.ScrollAreaScrollbar>
    );
}

export { ScrollArea, ScrollBar };
