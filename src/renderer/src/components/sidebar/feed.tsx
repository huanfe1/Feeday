import type { FeedType } from '@/store';
import { useFeedStore, useFolderStore, usePostStore } from '@/store';
import { zodResolver } from '@hookform/resolvers/zod';
import { memo, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import Avatar from '@/components/avatar';
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

function Feed({ feed, className }: { feed: FeedType; className?: string }) {
    const isSelected = useFeedStore(state => state.selectedFeedId === feed.id);

    const clickFeed = (e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        useFeedStore.getState().setSelectedFeedId(feed.id);
        useFolderStore.getState().setSelectedFolderId(null);
        usePostStore.getState().refreshPosts();
    };

    const [active, setActive] = useState<string | null>(null);

    return (
        <>
            <ContextMenu modal={false}>
                <ContextMenuTrigger asChild>
                    <div
                        className={cn('flex items-center gap-x-3 rounded-sm px-3 py-2 select-none', isSelected && 'bg-gray-300/70', className)}
                        id={`feed-${feed.id}`}
                        onClick={clickFeed}
                        onDoubleClick={() => window.open(feed.link, '_blank')}
                    >
                        <Avatar src={feed.icon} title={feed.title} />
                        <span className="flex-1 truncate text-sm font-medium capitalize">{feed.title}</span>
                        {feed.lastFetchError && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span className="i-mingcute-close-circle-fill text-red-500"></span>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{feed.lastFetchError}</p>
                                </TooltipContent>
                            </Tooltip>
                        )}
                        <span className={cn('size-1.5 rounded-full bg-gray-400', { hidden: !feed.hasUnread })}></span>
                    </div>
                </ContextMenuTrigger>
                <ContextMenuContent>
                    <ContextMenuItem onSelect={() => setActive('edit')}>编辑</ContextMenuItem>
                    <ContextMenuItem onSelect={() => setActive('delete')}>删除</ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem onSelect={() => window.open(feed.link, '_blank')}>在浏览器中打开网站</ContextMenuItem>
                    <ContextMenuItem onSelect={() => window.open(feed.url, '_blank')}>在浏览器中打开订阅源</ContextMenuItem>
                    <ContextMenuItem onSelect={() => navigator.clipboard.writeText(feed.link)}>复制网站地址</ContextMenuItem>
                    <ContextMenuItem onSelect={() => navigator.clipboard.writeText(feed.url)}>复制订阅源地址</ContextMenuItem>
                </ContextMenuContent>
            </ContextMenu>
            {active === 'delete' && <DeleteModal open={active === 'delete'} onOpenChange={() => setActive(null)} feed={feed} />}
            {active === 'edit' && <EditModal open={active === 'edit'} onOpenChange={() => setActive(null)} feed={feed} />}
        </>
    );
}

function DeleteModal({ open, onOpenChange, feed }: { open: boolean; onOpenChange: (open: boolean) => void; feed: FeedType }) {
    const deleteFeed = useFeedStore(state => state.deleteFeed);
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>确定删除吗？</AlertDialogTitle>
                    <AlertDialogDescription>删除后，「{feed.title}」订阅源及其所有文章将永久删除，无法恢复。</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteFeed(feed.id)}>确定</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

const editFeedSchema = z.object({
    title: z.string().min(1, '请输入订阅源标题'),
    link: z.url('请输入正确的网站地址'),
    fetchFrequency: z.number('更新频率不能为空').int().min(10, '更新频率必须大于 10 分钟'),
    folderId: z.number().nullable().optional(),
    view: z.number().int().min(1).max(2),
});

type EditFeedFormValues = z.infer<typeof editFeedSchema>;

function EditModal({ open, onOpenChange, feed }: { open: boolean; onOpenChange: (open: boolean) => void; feed: FeedType }) {
    const folders = useFolderStore(state => state.folders);
    const form = useForm<EditFeedFormValues>({
        resolver: zodResolver(editFeedSchema),
        defaultValues: {
            title: feed.title,
            link: feed.link,
            fetchFrequency: feed.fetchFrequency,
            folderId: feed.folderId ?? null,
            view: feed.view,
        },
    });

    useEffect(() => {
        if (!open) return;
        form.reset({
            title: feed.title,
            link: feed.link,
            fetchFrequency: feed.fetchFrequency,
            folderId: feed.folderId ?? null,
            view: feed.view,
        });
    }, [open, form, feed]);

    const updateFeed = useFeedStore(state => state.updateFeed);
    const refreshFeeds = useFeedStore(state => state.refreshFeeds);

    const onSubmit = (data: EditFeedFormValues) => {
        updateFeed(feed.id, {
            title: data.title,
            link: data.link,
            fetchFrequency: data.fetchFrequency,
            folderId: data.folderId ?? null,
            view: data.view,
        })
            .then(() => {
                refreshFeeds();
                toast.success('订阅源更新成功', { position: 'top-center', richColors: true });
                onOpenChange(false);
            })
            .catch(error => {
                toast.error('更新订阅源失败：' + error.message, { position: 'top-center', richColors: true });
            });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>编辑订阅源</DialogTitle>
                    <DialogDescription>修改订阅源的基本信息</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>订阅源标题</FormLabel>
                                    <FormControl>
                                        <Input placeholder="请输入订阅源标题" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="link"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>网站地址</FormLabel>
                                    <FormControl>
                                        <Input placeholder="请输入网站地址" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="fetchFrequency"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>更新频率（分钟）</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            placeholder="请输入更新频率"
                                            min="1"
                                            {...field}
                                            onChange={e => field.onChange(parseInt(e.target.value))}
                                            value={field.value}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="folderId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>文件夹</FormLabel>
                                    <Select value={field.value?.toString() ?? 'none'} onValueChange={value => field.onChange(value === 'none' ? null : parseInt(value))}>
                                        <FormControl>
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="未分类" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="none">未分类</SelectItem>
                                            {folders.map(folder => (
                                                <SelectItem key={folder.id} value={folder.id.toString()}>
                                                    {folder.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="view"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>视图</FormLabel>
                                    <Select value={field.value.toString()} onValueChange={value => field.onChange(parseInt(value))}>
                                        <FormControl>
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="选择视图" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="1">文章</SelectItem>
                                            <SelectItem value="2">媒体</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="outline">
                                    取消
                                </Button>
                            </DialogClose>
                            <Button type="submit">确定</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

export default memo(Feed);
