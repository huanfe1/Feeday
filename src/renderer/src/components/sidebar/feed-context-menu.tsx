import type { GetFeedsResult } from '@shared/types/database';
import type { ReactNode } from 'react';

import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from '@/components/ui/context-menu';

type FeedContextMenuProps = {
    feed: GetFeedsResult;
    children: ReactNode;
    onEdit: () => void;
    onDelete: () => void;
};

function FeedContextMenu({ feed, children, onDelete, onEdit }: FeedContextMenuProps) {
    const websiteUrl = feed.link ?? '';
    const sourceUrl = (feed.type === 1 ? feed.link : feed.url) ?? '';

    const openUrl = (url: string) => {
        if (!url) return;
        window.open(url, '_blank');
    };

    const copyToClipboard = (text: string) => {
        if (!text) return;
        void navigator.clipboard.writeText(text);
    };

    return (
        <ContextMenu modal={false}>
            <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
            <ContextMenuContent className="border-border/80 rounded-xl p-2 shadow-xl backdrop-blur-md">
                <ContextMenuItem className="rounded-md" onSelect={onEdit}>
                    <i className="i-mingcute-edit-2-line text-muted-foreground size-4" />
                    编辑
                </ContextMenuItem>
                <ContextMenuItem className="text-destructive focus:text-destructive rounded-md" onSelect={onDelete}>
                    <i className="i-mingcute-delete-2-line size-4" />
                    删除
                </ContextMenuItem>
                <ContextMenuSeparator className="my-2" />
                <ContextMenuItem className="rounded-md" onSelect={() => openUrl(websiteUrl)}>
                    <i className="i-mingcute-external-link-line text-muted-foreground size-4" />
                    在浏览器中打开网站
                </ContextMenuItem>
                <ContextMenuItem className="rounded-md" onSelect={() => openUrl(sourceUrl)}>
                    <i className="i-mingcute-rss-line text-muted-foreground size-4" />
                    在浏览器中打开订阅源
                </ContextMenuItem>
                <ContextMenuItem className="rounded-md" onSelect={() => copyToClipboard(websiteUrl)}>
                    <i className="i-mingcute-copy-2-line text-muted-foreground size-4" />
                    复制网站地址
                </ContextMenuItem>
                <ContextMenuItem className="rounded-md" onSelect={() => copyToClipboard(sourceUrl)}>
                    <i className="i-mingcute-copy-3-line text-muted-foreground size-4" />
                    复制订阅源地址
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    );
}

export default FeedContextMenu;
