import { useStore } from '@/store';
import NiceModal, { useModal } from '@ebay/nice-modal-react';
import type { FeedKey } from '@shared/types';
import type { GetFeedsFolderGroup, GetFeedsResult } from '@shared/types/database';
import { AnimatePresence, motion } from 'motion/react';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import useSWR, { useSWRConfig } from 'swr';

import { alertDialog } from '@/components/modal/dialog';
import { Button } from '@/components/ui/button';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { eventBus } from '@/lib/events';
import { cn } from '@/lib/utils';

import Feed from './feed';

const fetcherFeeds = ([_channel, view]: [string, number]) => window.electron.ipcRenderer.invoke('db-get-feeds', view);

function patchFeedUnread(data: GetFeedsFolderGroup[] | undefined, feedId: number, hasUnread: boolean): GetFeedsFolderGroup[] | undefined {
    if (!data) return data;

    let changed = false;
    const result = data.map(folder => {
        let folderChanged = false;
        const feeds = folder.feeds.map(feed => {
            if (feed.id !== feedId || feed.hasUnread === hasUnread) return feed;
            folderChanged = true;
            changed = true;
            return { ...feed, hasUnread };
        });
        return folderChanged ? { ...folder, feeds } : folder;
    });
    return changed ? result : data;
}

function patchFeedsUnreadByKey(data: GetFeedsFolderGroup[] | undefined, feedKey: FeedKey): GetFeedsFolderGroup[] | undefined {
    if (!data) return data;

    const [prefix, idStr] = feedKey.split('-');
    const id = Number(idStr);
    if (!Number.isFinite(id)) return data;

    const isInScope = (feed: GetFeedsResult) => {
        if (prefix === 'feed') return feed.id === id;
        if (prefix === 'folder') return feed.folderId === id;
        if (prefix === 'view') return feed.view === id;
        return false;
    };

    let changed = false;
    const result = data.map(folder => {
        let folderChanged = false;
        const feeds = folder.feeds.map(feed => {
            if (!isInScope(feed) || !feed.hasUnread) return feed;
            folderChanged = true;
            changed = true;
            return { ...feed, hasUnread: false };
        });
        return folderChanged ? { ...folder, feeds } : folder;
    });
    return changed ? result : data;
}

type FeedUpdatePatch = Pick<GetFeedsResult, 'memo' | 'folderId' | 'view'>;

function patchFeed(data: GetFeedsFolderGroup[] | undefined, feedId: number, patch: FeedUpdatePatch): GetFeedsFolderGroup[] | undefined {
    if (!data) return data;

    let sourceFolderIdx = -1;
    let sourceFeedIdx = -1;
    let currentFeed: GetFeedsResult | undefined;

    for (let i = 0; i < data.length; i++) {
        const idx = data[i].feeds.findIndex(f => f.id === feedId);
        if (idx !== -1) {
            sourceFolderIdx = i;
            sourceFeedIdx = idx;
            currentFeed = data[i].feeds[idx];
            break;
        }
    }
    if (!currentFeed || sourceFolderIdx === -1) return data;

    const updatedFeed: GetFeedsResult = {
        ...currentFeed,
        memo: patch.memo ?? null,
        folderId: patch.folderId ?? null,
        view: patch.view,
    };

    if (patch.view !== currentFeed.view) {
        const folder = data[sourceFolderIdx];
        const feeds = folder.feeds.filter((_, i) => i !== sourceFeedIdx);
        if (feeds.length === folder.feeds.length) return data;
        return data.map((f, i) => (i === sourceFolderIdx ? { ...f, feeds } : f));
    }

    const targetFolderId = patch.folderId ?? 0;
    const sourceFolderId = data[sourceFolderIdx].id;
    const folderChanged = targetFolderId !== sourceFolderId;

    if (!folderChanged) {
        if (currentFeed.memo === updatedFeed.memo && currentFeed.folderId === updatedFeed.folderId && currentFeed.view === updatedFeed.view) {
            return data;
        }
        const feeds = data[sourceFolderIdx].feeds.map((f, i) => (i === sourceFeedIdx ? updatedFeed : f));
        return data.map((f, i) => (i === sourceFolderIdx ? { ...f, feeds } : f));
    }

    let changed = false;
    const withoutFeed = data.map((folder, i) => {
        if (i !== sourceFolderIdx) return folder;
        changed = true;
        return { ...folder, feeds: folder.feeds.filter((_, j) => j !== sourceFeedIdx) };
    });

    const result = withoutFeed.map(folder => {
        if (folder.id !== targetFolderId) return folder;
        changed = true;
        return { ...folder, feeds: [...folder.feeds, updatedFeed] };
    });

    return changed ? result : data;
}

function Feeds({ className }: { className?: string }) {
    const view = useStore(state => state.view);
    const setFeedKey = useStore(state => state.setFeedKey);

    const { data: feedItems, mutate } = useSWR(['db-get-feeds', view], fetcherFeeds);
    const { mutate: globalMutate } = useSWRConfig();

    const direction = view === 1 ? 'left' : 'right';
    const width = Number(localStorage.getItem('resizable:feeds-sidebar'));

    const handleBlankClick = () => {
        setFeedKey(`view-${view}`);
        useStore.getState().setPostId(null);
    };
    const toggleView = (value: number) => {
        useStore.getState().setView(value);
        setFeedKey(`view-${value}`);
    };

    useEffect(() => {
        const removeRefresh = eventBus.on('refresh-feeds', () => mutate());
        const removeUnread = eventBus.on('mutate-feed-unread', ({ feedId, hasUnread }) => {
            mutate(current => patchFeedUnread(current, feedId, hasUnread), { revalidate: false });
        });
        const removeReadAll = eventBus.on('read-all-posts', ({ feedKey }) => {
            mutate(current => patchFeedsUnreadByKey(current, feedKey), { revalidate: false });
        });
        const removeFeedUpdate = eventBus.on('mutate-feed', ({ feedId, patch }) => {
            mutate(current => patchFeed(current, feedId, patch), { revalidate: false });
            if (patch.view !== view) {
                void globalMutate(['db-get-feeds', patch.view]);
            }
        });
        return () => {
            removeRefresh();
            removeUnread();
            removeReadAll();
            removeFeedUpdate();
        };
    }, [mutate, globalMutate, view]);

    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>
                <ScrollArea className={cn('min-h-0 flex-1 overflow-hidden px-2', className)} onClick={handleBlankClick}>
                    <div className="mt-3 mb-2 flex items-center justify-between text-sm font-medium select-none">
                        <span className="pl-2">订阅源</span>
                        <Tabs onValueChange={value => toggleView(Number(value))} value={view.toString()}>
                            <TabsList className="bg-sidebar-accent/75 h-8 px-1">
                                <TabsTrigger className="h-full px-3" value="1">
                                    文章
                                </TabsTrigger>
                                <TabsTrigger className="h-full px-3" value="2">
                                    媒体
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>
                    <AnimatePresence initial={false} mode="popLayout">
                        <motion.div
                            animate={{ x: 0 }}
                            exit={{ x: direction === 'right' ? width : -width }}
                            initial={{ x: direction === 'right' ? width : -width }}
                            key={view.toString()}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                        >
                            {!feedItems?.length ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <i className="i-mingcute-rss-line text-muted-foreground mb-3 text-4xl"></i>
                                    <p className="text-muted-foreground text-sm">暂无订阅源</p>
                                    <p className="text-muted-foreground/70 mt-1 text-xs">点击上方按钮添加订阅源</p>
                                </div>
                            ) : (
                                <div onClick={e => e.stopPropagation()}>
                                    {feedItems.map(item => (
                                        <FolderItem id={item.id} feeds={item.feeds} key={item.id} name={item.title} />
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </ScrollArea>
            </ContextMenuTrigger>
            <ContextMenuContent className="border-border/80 min-w-40 rounded-xl p-2 shadow-xl backdrop-blur-md">
                <ContextMenuItem className="rounded-md" onSelect={() => NiceModal.show(FolderDialog, { type: 'create', view })}>
                    <i className="i-mingcute-add-line text-muted-foreground size-4" />
                    添加文件夹
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    );
}

const FolderItem = memo(function FolderItem({ name, id, feeds }: { name?: string; id: number; feeds: GetFeedsResult[] }) {
    const DURATION = 0.2;

    const [isOpen, setIsOpen] = useState(false);
    const isSelected = useStore(state => state.feedKey === `folder-${id}`);
    const setFeedKey = useStore(state => state.setFeedKey);

    const openRenameDialog = () => {
        if (!id || !name) return;
        NiceModal.show(FolderDialog, { type: 'rename', folderId: id, folderIdName: name });
    };

    const handleDeleteFolder = () => {
        if (id == null) return;
        alertDialog({
            title: '删除文件夹',
            description: `确定要删除文件夹「${name || '未命名文件夹'}」吗？该文件夹内的订阅源将移至未分类。`,
            confirmVariant: 'destructive',
        }).then(() => {
            window.electron.ipcRenderer
                .invoke('db-delete-folder', id)
                .then(() => {
                    eventBus.emit('refresh-feeds', null);
                    toast.success('文件夹删除成功', { position: 'top-center', richColors: true });
                })
                .catch(err => {
                    toast.error(`删除文件夹失败：${err instanceof Error ? err.message : String(err)}`, {
                        position: 'top-center',
                        richColors: true,
                    });
                });
        });
    };

    const clickFolder = (e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        setFeedKey(`folder-${id}`);
    };

    const toggleFolderOpen = (e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        setIsOpen(!isOpen);
    };

    const needJumpFeedId = useRef<number | null>(null);
    const scrollToFeed = () => {
        // TODO: Feeds 存在滚动条，且目标文件夹未打开时，点击跳转等待文件夹打开时滚动条会出现抽搐
        // 似乎是因为文件夹打开导致的滚动条位置变化
        if (!needJumpFeedId.current) return;
        const feedElement = document.getElementById(`feed-${needJumpFeedId.current}`);
        if (feedElement) {
            feedElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            needJumpFeedId.current = null;
        }
    };

    const handleJumpToFeed = useCallback(
        ({ feedId, postId }: { feedId: number; postId?: number | null }) => {
            if (!feeds.some(feed => feed.id === feedId)) return;
            setFeedKey(`feed-${feedId}`);
            needJumpFeedId.current = feedId;
            postId && useStore.getState().setPostId(postId);

            if (isOpen || id === 0) {
                scrollToFeed();
                return;
            }

            setIsOpen(true);
            const feedElement = document.getElementById(`feed-${feedId}`);
            if (!feedElement) return;
            setTimeout(() => feedElement.scrollIntoView({ behavior: 'smooth', block: 'center' }), DURATION * 1000);
        },
        [feeds, isOpen, id, DURATION, setFeedKey, needJumpFeedId],
    );

    useEffect(() => {
        const removeListener = eventBus.on('jump-to-feed', handleJumpToFeed);
        return () => removeListener();
    }, [handleJumpToFeed]);

    if (id === 0) {
        return feeds.map(item => <Feed feed={item} key={item.id} />);
    }

    const hasUnread = feeds.some(feed => feed.hasUnread);
    return (
        <div>
            <ContextMenu>
                <ContextMenuTrigger asChild>
                    <div className={cn('flex cursor-default items-center gap-x-1 rounded-sm p-2', isSelected && 'bg-sidebar-accent')} onClick={clickFolder}>
                        <motion.span
                            className="i-mingcute-right-line"
                            animate={{ rotate: isOpen ? 90 : 0 }}
                            initial={false}
                            onClick={toggleFolderOpen}
                            transition={{ duration: DURATION }}
                        />
                        <span className="w-full text-sm font-medium">{name || '未命名文件夹'}</span>
                        <span className={cn('size-1.5 shrink-0 rounded-full bg-gray-400', { hidden: !hasUnread })}></span>
                    </div>
                </ContextMenuTrigger>
                <ContextMenuContent className="border-border/80 min-w-40 rounded-xl p-2 shadow-xl backdrop-blur-md">
                    <ContextMenuItem className="rounded-md" onSelect={openRenameDialog}>
                        <i className="i-mingcute-edit-2-line text-muted-foreground size-4" />
                        重命名
                    </ContextMenuItem>
                    <ContextMenuItem className="text-destructive focus:text-destructive rounded-md" onSelect={handleDeleteFolder}>
                        <i className="i-mingcute-delete-2-line size-4" />
                        删除
                    </ContextMenuItem>
                </ContextMenuContent>
            </ContextMenu>

            <AnimatePresence initial={false}>
                {isOpen && (
                    <motion.div
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        initial={{ height: 0 }}
                        key="folder-content"
                        onAnimationComplete={() => scrollToFeed()}
                        style={{ overflow: 'hidden' }}
                        transition={{ duration: DURATION, ease: 'easeInOut' }}
                    >
                        {feeds.map(item => (
                            <Feed className="pl-6" feed={item} key={item.id} />
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
});

type FolderDialog = { type: 'create'; view: number } | { type: 'rename'; folderId: number; folderIdName: string };
const FolderDialog = NiceModal.create((props: FolderDialog) => {
    const modal = useModal();
    const [name, setName] = useState('');

    useEffect(() => {
        if (props.type === 'rename') setName(props.folderIdName);
    }, [props]);

    const handleOpenChange = () => {
        modal.visible ? modal.hide() : modal.show();
    };

    const handleCreateFolder = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const newName = name.trim();
        if (!newName) return;
        if (newName.length > 50) {
            toast.error('文件夹名称不能超过50个字符', { position: 'top-center', richColors: true });
            return;
        }

        if (props.type === 'create') {
            window.electron.ipcRenderer
                .invoke('db-create-folder', newName, props.view)
                .then(() => {
                    toast.success(`文件夹「${newName}」创建成功`, { position: 'top-center', richColors: true });
                    modal.hide();
                    eventBus.emit('refresh-feeds', null);
                })
                .catch(err => {
                    toast.error(err.message, { position: 'top-center', richColors: true });
                });
        } else if (props.type === 'rename') {
            window.electron.ipcRenderer
                .invoke('db-update-folder', props.folderId, newName)
                .then(() => {
                    toast.success(`文件夹「${newName}」重命名成功`, { position: 'top-center', richColors: true });
                    modal.hide();
                    eventBus.emit('refresh-feeds', null);
                })
                .catch(err => {
                    toast.error(err.message, { position: 'top-center', richColors: true });
                });
        }
    };

    return (
        <Dialog onOpenChange={handleOpenChange} open={modal.visible}>
            <DialogContent>
                <form onSubmit={handleCreateFolder}>
                    <DialogHeader>
                        <DialogTitle>新建文件夹</DialogTitle>
                        <DialogDescription>输入文件夹名称</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <Field>
                            <Input autoFocus onChange={e => setName(e.target.value)} placeholder="请输入文件夹名称" type="text" value={name} />
                        </Field>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">取消</Button>
                        </DialogClose>
                        <Button type="submit">创建</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
});

export default memo(Feeds);
