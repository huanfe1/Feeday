import { Loader2Icon } from 'lucide-react';

import { cn } from '@/lib/utils';

function Spinner({ className, ...props }: React.ComponentProps<'svg'>) {
    return <Loader2Icon className={cn('size-4 animate-spin', className)} role="status" aria-label="Loading" {...props} />;
}

export { Spinner };
