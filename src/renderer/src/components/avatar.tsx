import { memo } from 'react';

import { AvatarFallback, AvatarImage, Avatar as AvatarRoot } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

type AvatarType = {
    src?: string;
    title: string;
    className?: string;
};

const Avatar = memo(function Avatar({ src, title, className }: AvatarType) {
    return (
        <AvatarRoot className={cn('size-4', className)}>
            <AvatarImage src={src} />
            <AvatarFallback>{title.slice(0, 1)}</AvatarFallback>
        </AvatarRoot>
    );
});

export default Avatar;
