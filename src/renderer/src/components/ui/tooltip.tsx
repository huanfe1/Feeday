import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import * as React from 'react';

import { cn } from '@/lib/utils';

// Context 用于在 Tooltip 和 TooltipTrigger 之间共享控制函数
const TooltipContext = React.createContext<{
    handleMouseEnter: () => void;
    handleMouseLeave: () => void;
} | null>(null);

function TooltipProvider({ delayDuration = 0, ...props }: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
    return <TooltipPrimitive.Provider data-slot="tooltip-provider" delayDuration={delayDuration} {...props} />;
}

function Tooltip({ defaultOpen, open: controlledOpen, onOpenChange, ...props }: React.ComponentProps<typeof TooltipPrimitive.Root>) {
    const [internalOpen, setInternalOpen] = React.useState(defaultOpen ?? false);
    const open = controlledOpen ?? internalOpen;
    const handleOpenChange = onOpenChange ?? setInternalOpen;

    const handleMouseEnter = React.useCallback(() => {
        handleOpenChange(true);
    }, [handleOpenChange]);

    const handleMouseLeave = React.useCallback(() => {
        handleOpenChange(false);
    }, [handleOpenChange]);

    const contextValue = React.useMemo(
        () => ({
            handleMouseEnter,
            handleMouseLeave,
        }),
        [handleMouseEnter, handleMouseLeave],
    );

    return (
        <TooltipContext.Provider value={contextValue}>
            <TooltipProvider>
                <TooltipPrimitive.Root data-slot="tooltip" open={open} onOpenChange={handleOpenChange} {...props} />
            </TooltipProvider>
        </TooltipContext.Provider>
    );
}

function TooltipTrigger(props: Omit<React.ComponentProps<typeof TooltipPrimitive.Trigger>, 'onMouseEnter' | 'onMouseLeave'>) {
    const context = React.useContext(TooltipContext);

    const handleMouseEnter = React.useCallback(() => {
        context?.handleMouseEnter();
    }, [context]);

    const handleMouseLeave = React.useCallback(() => {
        context?.handleMouseLeave();
    }, [context]);

    return (
        <TooltipPrimitive.Trigger
            className="no-drag-region pointer-events-auto"
            data-slot="tooltip-trigger"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            {...props}
        />
    );
}

function TooltipContent({
    className,
    sideOffset = 0,
    children,
    theme = 'dark',
    ...props
}: Omit<React.ComponentProps<typeof TooltipPrimitive.Content>, 'onMouseEnter' | 'onMouseLeave'> & { theme?: 'dark' | 'light' }) {
    const context = React.useContext(TooltipContext);

    const handleMouseEnter = React.useCallback(() => {
        context?.handleMouseEnter();
    }, [context]);

    const handleMouseLeave = React.useCallback(() => {
        context?.handleMouseLeave();
    }, [context]);

    return (
        <TooltipPrimitive.Portal>
            <TooltipPrimitive.Content
                className={cn(
                    'no-drag-region bg-foreground text-background animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-fit origin-(--radix-tooltip-content-transform-origin) rounded-md px-3 py-1.5 text-xs text-balance',
                    { 'bg-background text-foreground shadow': theme === 'light' },
                    { 'bg-foreground text-background': theme === 'dark' },
                    className,
                )}
                data-slot="tooltip-content"
                sideOffset={sideOffset}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                {...props}
            >
                {children}
                {theme === 'dark' ? (
                    <TooltipPrimitive.Arrow className="bg-foreground fill-foreground z-50 size-2.5 translate-y-[calc(-50%-2px)] rotate-45 rounded-[2px]" />
                ) : (
                    <TooltipPrimitive.Arrow asChild>
                        <span
                            className={cn('bg-background size-3 translate-y-[calc(-50%)] -rotate-45 border')}
                            style={{ clipPath: 'polygon(0 0, 10% 0, 100% 90%, 100% 100%, 0 100%)' }}
                        />
                    </TooltipPrimitive.Arrow>
                )}
            </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
    );
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
