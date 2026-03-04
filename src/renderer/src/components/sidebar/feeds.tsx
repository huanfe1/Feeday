import { useFeedStore, useFolderStore, usePostStore, useView } from '@/store';
import type { FeedType } from '@/store';
import { AnimatePresence, motion } from 'motion/react';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useShallow } from 'zustand/react/shallow';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { type EventMap, eventBus } from '@/lib/events';
import { cn } from '@/lib/utils';

import Feed from './feed';

function validateFolderName(name: string): string | null {
    const trimmed = name.trim();
    if (!trimmed) return '请输入文件夹名称';
    if (trimmed.length > 50) return '文件夹名称不能超过50个字符';
    return null;
}

function handleFolderError(error: unknown, action: '创建' | '更新'): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('UNIQUE constraint failed')) {
        toast.error('文件夹名称已存在', { position: 'top-center', richColors: true });
    } else {
        toast.error(`${action}文件夹失败：${errorMessage}`, { position: 'top-center', richColors: true });
    }
}

function Feeds({ className }: { className?: string }) {
    const allFeeds = useFeedStore(useShallow(state => state.feeds));
    const folders = useFolderStore(state => state.folders);
    const createFolder = useFolderStore(state => state.createFolder);
    const refreshFeeds = useFeedStore(state => state.refreshFeeds);
    const view = useView(state => state.view);
    const feeds = useMemo(() => allFeeds.filter(feed => feed.view === view), [allFeeds, view]);
    const [direction, setDirection] = useState<'left' | 'right' | null>(null);
    const [showAddFolder, setShowAddFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const width = Number(localStorage.getItem('resizable:feeds-sidebar'));

    const cancelSelectFeed = () => {
        useFeedStore.getState().setSelectedFeedId(null);
        useFolderStore.getState().setSelectedFolderId(null);
        usePostStore.getState().setSelectedPost(null);
        usePostStore.getState().refreshPosts();
    };

    const setView = useView(state => state.setView);
    const toggleView = (value: number) => {
        setDirection(value > view ? 'right' : 'left');
        setView(value);
    };

    useEffect(() => cancelSelectFeed(), [view]);

    const handleAddFolder = () => {
        const error = validateFolderName(newFolderName);
        if (error) {
            toast.error(error, { position: 'top-center', richColors: true });
            return;
        }
        const name = newFolderName.trim();
        createFolder(name)
            .then(() => {
                refreshFeeds();
                toast.success(`文件夹「${name}」创建成功`, { position: 'top-center', richColors: true });
                setNewFolderName('');
                setShowAddFolder(false);
            })
            .catch(err => handleFolderError(err, '创建'));
    };

    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>
                <ScrollArea className={cn('min-h-0 flex-1 overflow-hidden px-3', className)} onClick={cancelSelectFeed}>
                    <div className="mt-3 mb-2 flex items-center justify-between text-sm font-medium select-none">
                        <span>订阅源</span>
                        <Tabs onValueChange={value => toggleView(Number(value))} value={view.toString()}>
                            <TabsList className="h-8 bg-gray-200/75 px-1">
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
                            {feeds.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <i className="i-mingcute-rss-line text-muted-foreground mb-3 text-4xl"></i>
                                    <p className="text-muted-foreground text-sm">暂无订阅源</p>
                                    <p className="text-muted-foreground/70 mt-1 text-xs">点击上方按钮添加订阅源</p>
                                </div>
                            ) : (
                                <div onClick={e => e.stopPropagation()}>
                                    {folders.map(folder => (
                                        <FolderItem
                                            id={folder.id}
                                            feeds={feeds.filter(feed => feed.folderId === folder.id)}
                                            isOpen={folder.isOpen}
                                            key={folder.id}
                                            name={folder.name}
                                        />
                                    ))}
                                    <FolderItem id={0} feeds={feeds.filter(feed => feed.folderId === null)} key={0} />
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </ScrollArea>
            </ContextMenuTrigger>
            <ContextMenuContent>
                <ContextMenuItem onSelect={() => setShowAddFolder(true)}>添加文件夹</ContextMenuItem>
            </ContextMenuContent>
            <Dialog
                onOpenChange={open => {
                    if (!open) setNewFolderName('');
                    setShowAddFolder(open);
                }}
                open={showAddFolder}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>新建文件夹</DialogTitle>
                        <DialogDescription>输入文件夹名称</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <Input
                            autoFocus
                            onChange={e => setNewFolderName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAddFolder()}
                            placeholder="请输入文件夹名称"
                            value={newFolderName}
                        />
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="outline">
                                取消
                            </Button>
                        </DialogClose>
                        <Button onClick={handleAddFolder} type="button">
                            创建
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </ContextMenu>
    );
}

const FolderItem = memo(function FolderItem({ name, id, feeds, isOpen = false }: { name?: string; id: number | null; feeds: FeedType[]; isOpen?: boolean }) {
    const DURATION = 0.2;

    const needJumpFeedId = useRef<number | null>(null);
    const needJumpPostId = useRef<number | null>(null);

    const isSelected = useFolderStore(state => state.selectedFolderId === id);
    const setFolderOpen = useFolderStore(state => state.setFolderOpen);
    const updateFolder = useFolderStore(state => state.updateFolder);
    const deleteFolder = useFolderStore(state => state.deleteFolder);
    const refreshFeeds = useFeedStore(state => state.refreshFeeds);

    const [showRenameFolder, setShowRenameFolder] = useState(false);
    const [showDeleteFolder, setShowDeleteFolder] = useState(false);
    const [renameFolderName, setRenameFolderName] = useState(name ?? '');

    const openRenameDialog = () => {
        setRenameFolderName(name ?? '');
        setShowRenameFolder(true);
    };

    const handleRenameFolder = () => {
        if (id == null) return;
        const error = validateFolderName(renameFolderName);
        if (error) {
            toast.error(error, { position: 'top-center', richColors: true });
            return;
        }
        const newName = renameFolderName.trim();
        updateFolder(id, newName)
            .then(() => {
                refreshFeeds();
                toast.success('文件夹重命名成功', { position: 'top-center', richColors: true });
                setShowRenameFolder(false);
            })
            .catch(err => handleFolderError(err, '更新'));
    };

    const handleDeleteFolder = () => {
        if (id == null) return;
        deleteFolder(id)
            .then(() => {
                refreshFeeds();
                toast.success('文件夹删除成功', { position: 'top-center', richColors: true });
                setShowDeleteFolder(false);
            })
            .catch(err => {
                toast.error(`删除文件夹失败：${err instanceof Error ? err.message : String(err)}`, {
                    position: 'top-center',
                    richColors: true,
                });
            });
    };

    const clickFolder = (e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        useFolderStore.getState().setSelectedFolderId(id);
        useFeedStore.getState().setSelectedFeedId(null);
        usePostStore.getState().refreshPosts();
    };

    const clickHandle = (e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        if (id !== null) setFolderOpen(id, !isOpen);
    };

    const scrollToFeed = () => {
        // TODO: Feeds 存在滚动条，且目标文件夹未打开时，点击跳转等待文件夹打开时滚动条会出现抽搐
        // 似乎是因为文件夹打开导致的滚动条位置变化
        if (!needJumpFeedId.current || !needJumpPostId.current) return;
        const feedElement = document.getElementById(`feed-${needJumpFeedId.current}`);
        if (feedElement) {
            useFolderStore.getState().setSelectedFolderId(null);
            useFeedStore.getState().setSelectedFeedId(needJumpFeedId.current);
            usePostStore.getState().refreshPosts();
            feedElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            usePostStore.getState().setSelectedPost(needJumpPostId.current);
            needJumpFeedId.current = null;
            needJumpPostId.current = null;
        }
    };

    useEffect(() => {
        const handleJumpToFeed = ({ feedId, postId }: EventMap['jump-to-feed']) => {
            if (!feeds.some(feed => feed.id === feedId)) return;
            needJumpFeedId.current = feedId;
            needJumpPostId.current = postId;
            if (id === null || isOpen) {
                scrollToFeed();
            } else {
                setFolderOpen(id, true);
            }
        };
        const removeListener = eventBus.on('jump-to-feed', handleJumpToFeed);
        return () => removeListener();
    }, [feeds, setFolderOpen, id, isOpen]);

    // if (feeds.length === 0) return null;
    if (id === 0) return feeds.map(item => <Feed className="pl-5" feed={item} key={item.id} />);

    const hasUnread = feeds.some(feed => feed.hasUnread);
    return (
        <div>
            <ContextMenu>
                <ContextMenuTrigger asChild>
                    <div className={cn('flex cursor-default items-center gap-x-1 rounded-sm p-2', isSelected && 'bg-gray-300/70')} onClick={clickFolder}>
                        <motion.span
                            className="i-mingcute-right-line"
                            animate={{ rotate: isOpen ? 90 : 0 }}
                            initial={false}
                            onClick={clickHandle}
                            transition={{ duration: DURATION }}
                        />
                        <span className="w-full text-sm font-medium">{name || '未命名文件夹'}</span>
                        <span className={cn('size-1.5 shrink-0 rounded-full bg-gray-400', { hidden: !hasUnread })}></span>
                    </div>
                </ContextMenuTrigger>
                <ContextMenuContent>
                    <ContextMenuItem onSelect={openRenameDialog}>重命名</ContextMenuItem>
                    <ContextMenuItem className="text-destructive focus:text-destructive" onSelect={() => setShowDeleteFolder(true)}>
                        删除
                    </ContextMenuItem>
                </ContextMenuContent>
            </ContextMenu>

            <Dialog
                onOpenChange={open => {
                    if (!open) setRenameFolderName(name ?? '');
                    setShowRenameFolder(open);
                }}
                open={showRenameFolder}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>重命名文件夹</DialogTitle>
                        <DialogDescription>输入新的文件夹名称</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <Input
                            autoFocus
                            onChange={e => setRenameFolderName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleRenameFolder()}
                            placeholder="请输入文件夹名称"
                            value={renameFolderName}
                        />
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="outline">
                                取消
                            </Button>
                        </DialogClose>
                        <Button onClick={handleRenameFolder} type="button">
                            确定
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog onOpenChange={setShowDeleteFolder} open={showDeleteFolder}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>删除文件夹</AlertDialogTitle>
                        <AlertDialogDescription>确定要删除文件夹「{name || '未命名文件夹'}」吗？该文件夹内的订阅源将移至未分类。</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={e => {
                                e.preventDefault();
                                handleDeleteFolder();
                            }}
                        >
                            确定
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

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
                            <Feed className="pl-5" feed={item} key={item.id} />
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
});

export default memo(Feeds);
