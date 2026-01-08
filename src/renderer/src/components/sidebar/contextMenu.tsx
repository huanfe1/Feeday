import { useFeedStore, usePostStore } from '@/store';
import { memo, useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

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
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from '@/components/ui/context-menu';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const ContextMenuFeed = memo(
    function ContextMenuFeed({ children, feed }: { children: React.ReactNode; feed: any }) {
        const [actions, setActions] = useState<string | null>(null);
        const [editOpen, setEditOpen] = useState(false);

        // 使用选择器只订阅需要的函数，避免订阅整个 store
        const refreshFeeds = useFeedStore(state => state.refreshFeeds);
        const setCurrentFeed = useFeedStore(state => state.setCurrentFeed);
        const setCurrentPost = usePostStore(state => state.setCurrentPost);

        const deleteFeed = useCallback(() => {
            window.electron.ipcRenderer.invoke('db-delete-feed', feed.id).then(() => {
                toast.success(`${feed.title} 删除成功`);
                refreshFeeds();
                setCurrentFeed(null);
                setCurrentPost(null);
            });
        }, [feed.id, feed.title, refreshFeeds, setCurrentFeed, setCurrentPost]);

        const handleEditOpen = useCallback(() => setEditOpen(true), []);
        const handleDeleteOpen = useCallback(() => setActions('delete'), []);
        const handleOpenLink = useCallback(() => window.open(feed.link, '_blank'), [feed.link]);
        const handleOpenFeed = useCallback(() => window.open(feed.url, '_blank'), [feed.url]);
        const handleDeleteClose = useCallback(() => setActions(null), []);

        return (
            <>
                <ContextMenu>
                    <ContextMenuTrigger>{children}</ContextMenuTrigger>
                    <ContextMenuContent>
                        <ContextMenuItem onSelect={handleEditOpen}>编辑</ContextMenuItem>
                        <ContextMenuItem onSelect={handleDeleteOpen}>删除</ContextMenuItem>
                        <ContextMenuSeparator />
                        <ContextMenuItem onSelect={handleOpenLink}>在浏览器中打开网站</ContextMenuItem>
                        <ContextMenuItem onSelect={handleOpenFeed}>在浏览器中打开订阅源</ContextMenuItem>
                    </ContextMenuContent>
                </ContextMenu>
                <AlertDialog open={actions === 'delete'} onOpenChange={handleDeleteClose}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>确定删除吗？</AlertDialogTitle>
                            <AlertDialogDescription>删除后，「{feed.title}」订阅源及其所有文章将永久删除，无法恢复。</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>取消</AlertDialogCancel>
                            <AlertDialogAction onClick={deleteFeed}>确定</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
                <EditFeed feed={feed} open={editOpen} onOpenChange={setEditOpen} />
            </>
        );
    },
    (prevProps, nextProps) => {
        // Only re-render if feed id changes (feed object reference may change but id is stable)
        return prevProps.feed.id === nextProps.feed.id && prevProps.children === nextProps.children;
    },
);

export default ContextMenuFeed;

const EditFeed = memo(
    function EditFeed({ feed, open, onOpenChange }: { feed: any; open: boolean; onOpenChange: (open: boolean) => void }) {
        const refreshFeeds = useFeedStore(state => state.refreshFeeds);

        const [formData, setFormData] = useState({
            title: feed.title || '',
            link: feed.link || '',
            fetchFrequency: feed.fetchFrequency || 60,
        });

        // 当对话框打开时，重置表单为原始值
        useEffect(() => {
            if (open) {
                setFormData({
                    title: feed.title || '',
                    link: feed.link || '',
                    fetchFrequency: feed.fetchFrequency || 60,
                });
            }
        }, [open, feed]);

        const handleSubmit = useCallback(() => {
            if (!formData.title.trim()) {
                toast.error('请输入订阅源标题', { position: 'top-center', richColors: true });
                return;
            }
            if (!formData.link.trim()) {
                toast.error('请输入网站地址', { position: 'top-center', richColors: true });
                return;
            }
            const urlPattern = /^(https?:\/\/)[^\s/$.?#].[^\s]*$/i;
            if (!urlPattern.test(formData.link)) {
                toast.error('请输入正确的网址', { position: 'top-center', richColors: true });
                return;
            }
            if (formData.fetchFrequency < 1) {
                toast.error('更新频率必须大于0', { position: 'top-center', richColors: true });
                return;
            }

            window.electron.ipcRenderer
                .invoke('db-update-feed', {
                    id: feed.id,
                    title: formData.title,
                    link: formData.link,
                    fetchFrequency: formData.fetchFrequency,
                })
                .then(() => {
                    toast.success('订阅源更新成功', { position: 'top-center', richColors: true });
                    refreshFeeds();
                    onOpenChange(false);
                })
                .catch(error => {
                    toast.error('更新订阅源失败：' + error.message, { position: 'top-center', richColors: true });
                });
        }, [formData, feed.id, refreshFeeds, onOpenChange]);

        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>编辑订阅源</DialogTitle>
                        <DialogDescription>修改订阅源的基本信息</DialogDescription>
                    </DialogHeader>
                    <div className="my-3 space-y-4">
                        <div>
                            <Label htmlFor="edit-title" className="mb-2">
                                订阅源标题
                            </Label>
                            <Input
                                type="text"
                                id="edit-title"
                                placeholder="请输入订阅源标题"
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label htmlFor="edit-link" className="mb-2">
                                网站地址
                            </Label>
                            <Input
                                type="text"
                                id="edit-link"
                                placeholder="请输入网站地址"
                                value={formData.link}
                                onChange={e => setFormData({ ...formData, link: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label htmlFor="edit-fetchFrequency" className="mb-2">
                                更新频率（分钟）
                            </Label>
                            <Input
                                type="number"
                                id="edit-fetchFrequency"
                                placeholder="请输入更新频率"
                                min="1"
                                value={formData.fetchFrequency}
                                onChange={e => setFormData({ ...formData, fetchFrequency: parseInt(e.target.value) || 60 })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">取消</Button>
                        </DialogClose>
                        <Button onClick={handleSubmit} type="submit">
                            确定
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        );
    },
    (prevProps, nextProps) => {
        // Only re-render if feed id, open state, or onOpenChange changes
        return prevProps.feed.id === nextProps.feed.id && prevProps.open === nextProps.open && prevProps.onOpenChange === nextProps.onOpenChange;
    },
);
