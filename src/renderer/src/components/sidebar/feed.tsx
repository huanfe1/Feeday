import type { FeedType } from '@/store';
import { useFeedStore } from '@/store';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from '@/components/ui/context-menu';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export default function Feed({ feed }: { feed: FeedType }) {
    const setSelectFeed = useFeedStore(state => state.setSelectFeed);
    const isSelected = useFeedStore(state => state.selectFeed === feed.id);

    const clickFeed = (e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        setSelectFeed(feed.id);
    };

    const [active, setActive] = useState<string | null>(null);

    return (
        <>
            <ContextMenu modal={false}>
                <ContextMenuTrigger asChild>
                    <div
                        onClick={clickFeed}
                        onDoubleClick={() => window.open(feed.link, '_blank')}
                        className={cn('flex items-center justify-center gap-x-3 rounded-sm px-3 py-2 select-none', isSelected && 'bg-gray-300/70')}
                    >
                        <Avatar className="size-4">
                            <AvatarImage
                                src={
                                    feed.icon || `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${new URL(feed.link).origin}&size=64`
                                }
                            />
                            <AvatarFallback>{feed.title.slice(0, 1)}</AvatarFallback>
                        </Avatar>
                        <span className="flex-1 truncate text-sm font-medium capitalize">{feed.title}</span>
                        <span className={cn('size-1.5 rounded-full bg-gray-400', { hidden: !feed.has_unread })}></span>
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
            <DeleteModal open={active === 'delete'} onOpenChange={() => setActive(null)} feed={feed} />
            <EditModal open={active === 'edit'} onOpenChange={() => setActive(null)} feed={feed} />
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
    fetch_frequency: z.number('更新频率不能为空').int().min(10, '更新频率必须大于 10 分钟'),
});

type EditFeedFormValues = z.infer<typeof editFeedSchema>;

function EditModal({ open, onOpenChange, feed }: { open: boolean; onOpenChange: (open: boolean) => void; feed: FeedType }) {
    const form = useForm<EditFeedFormValues>({
        resolver: zodResolver(editFeedSchema),
        defaultValues: {
            title: feed.title,
            link: feed.link,
            fetch_frequency: feed.fetch_frequency,
        },
    });

    useEffect(() => {
        if (!open) return;
        form.reset({
            title: feed.title,
            link: feed.link,
            fetch_frequency: feed.fetch_frequency,
        });
    }, [open, form, feed]);

    const updateFeed = useFeedStore(state => state.updateFeed);

    const onSubmit = (data: EditFeedFormValues) => {
        updateFeed({
            id: feed.id,
            title: data.title,
            link: data.link,
            fetch_frequency: data.fetch_frequency,
        })
            .then(() => {
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
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                            name="fetch_frequency"
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
