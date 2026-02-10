import { cn } from '@/lib/utils';

function Spinner({ className, ...props }: React.ComponentProps<'i'>) {
    return <i className={cn('i-mingcute-loading-line size-4 animate-spin', className)} aria-label="Loading" role="status" {...props} />;
}

export { Spinner };
