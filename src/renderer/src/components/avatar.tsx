import { memo } from 'react';

import { AvatarFallback, AvatarImage, Avatar as AvatarRoot } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

type AvatarType = {
    defaultAvatarUrl?: string | null;
    domain: string;
    title: string;
    className?: string;
};

const DEFAULT_AVATAR_PROXY = 'https://unavatar.webp.se/${url}';
const AVATAR_PROXY_STORAGE_KEY = 'feeday-avatar-proxy';

function toHostname(domain: string): string {
    if (!domain) return '';
    const normalized = domain.trim();
    if (!normalized) return '';
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
        return normalized.replace(/\/+$/, '');
    }
    try {
        return new URL(normalized).hostname;
    } catch {
        return normalized.replace(/\/+$/, '');
    }
}

function getAvatarProxyTemplate(): string {
    try {
        const fromStorage = localStorage.getItem(AVATAR_PROXY_STORAGE_KEY);
        if (fromStorage && fromStorage.trim()) {
            return fromStorage.trim();
        }
    } catch {
        // Ignore localStorage read errors.
    }
    return DEFAULT_AVATAR_PROXY;
}

const Avatar = memo(function Avatar({ defaultAvatarUrl, domain, title, className }: AvatarType) {
    const hostname = toHostname(domain);
    const proxyTemplate = getAvatarProxyTemplate();
    const proxyAvatar = hostname ? proxyTemplate.replace('${url}', hostname) : undefined;
    const src = defaultAvatarUrl ?? proxyAvatar;

    return (
        <AvatarRoot className={cn('size-4', className)}>
            <AvatarImage className="dark:bg-foreground" src={src ?? undefined} />
            <AvatarFallback>{title.slice(0, 1)}</AvatarFallback>
        </AvatarRoot>
    );
});

export default Avatar;
