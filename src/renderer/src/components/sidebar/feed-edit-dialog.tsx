import NiceModal, { useModal } from '@ebay/nice-modal-react';
import { zodResolver } from '@hookform/resolvers/zod';
import type { GetFeedsResult } from '@shared/types/database';
import type { FeedDetail } from '@shared/types/database';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import useSWR from 'swr';
import { z } from 'zod';

import Avatar from '@/components/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { eventBus } from '@/lib/events';

const editFeedSchema = z.object({
    title: z.string().min(1, '订阅源标题不能为空'),
    memo: z.string().max(50, '备注不能超过 50 个字符').optional(),
    fetchFrequency: z.number('更新频率不能为空').int().min(10, '更新频率必须大于 10 分钟'),
    folderId: z.number().nullable().optional(),
    view: z.number().int().min(1).max(2),
});

type EditFeedFormValues = z.infer<typeof editFeedSchema>;

const fetcherFolders = () => window.electron.ipcRenderer.invoke('db-get-folders');

const FeedEditDialog = NiceModal.create<{ feed: GetFeedsResult }>(({ feed }) => {
    const { data: folders = [] } = useSWR('db-get-folders', fetcherFolders);
    const modal = useModal();

    const [feedDetail, setFeedDetail] = useState<FeedDetail | null>(null);
    const currentFeedDetail = feedDetail?.id === feed.id ? feedDetail : null;
    const displayTitle = currentFeedDetail?.memo ?? currentFeedDetail?.title ?? feed.memo ?? feed.title ?? '';
    const headerTitle = currentFeedDetail?.title?.trim() || feed.title?.trim() || displayTitle || '未命名订阅源';
    const headerDescription = currentFeedDetail?.description?.trim() || '';

    const form = useForm<EditFeedFormValues>({
        resolver: zodResolver(editFeedSchema),
        defaultValues: {
            title: feed.title,
            memo: feed.memo ?? '',
            fetchFrequency: 60,
            folderId: feed.folderId ?? null,
            view: feed.view,
        },
    });

    useEffect(() => {
        if (!modal.visible || feed.id == null) return;
        let cancelled = false;
        window.electron.ipcRenderer
            .invoke('db-get-feed-by-id', feed.id)
            .then(detail => {
                if (!cancelled) setFeedDetail(detail);
            })
            .catch(() => {
                if (!cancelled) setFeedDetail(null);
            });
        return () => {
            cancelled = true;
        };
    }, [feed.id, modal.visible]);

    useEffect(() => {
        if (!modal.visible) return;
        form.reset({
            title: currentFeedDetail?.title ?? feed.title,
            memo: currentFeedDetail?.memo ?? feed.memo ?? '',
            fetchFrequency: currentFeedDetail?.fetchFrequency ?? 60,
            folderId: currentFeedDetail?.folderId ?? feed.folderId ?? null,
            view: currentFeedDetail?.view ?? feed.view,
        });
    }, [form, feed, currentFeedDetail, modal.visible]);

    const onSubmit = async (data: EditFeedFormValues) => {
        if (currentFeedDetail?.id == null && feed.id == null) return;

        window.electron.ipcRenderer
            .invoke('db-update-feed', currentFeedDetail?.id ?? feed.id!, {
                memo: data.memo?.trim() || null,
                fetchFrequency: data.fetchFrequency,
                folderId: data.folderId === null ? null : data.folderId,
                view: data.view,
            })
            .then(() => {
                eventBus.emit('refresh-feeds', null);
                toast.success('订阅源更新成功', { position: 'top-center', richColors: true });
                modal.hide();
            })
            .catch(error => {
                toast.error('更新订阅源失败：' + error.message, { position: 'top-center', richColors: true });
            });
    };

    const handleOpenChange = () => {
        modal.visible ? modal.hide() : modal.show();
    };

    return (
        <Dialog onOpenChange={handleOpenChange} open={modal.visible}>
            <DialogContent className="flex flex-col overflow-hidden p-0 shadow-2xl">
                <DialogHeader className="bg-sidebar-accent/60 flex-none border-b px-6 py-5">
                    <div className="flex items-center gap-3">
                        <Avatar className="ring-border/70 size-9 ring-1" defaultAvatarUrl={feed.icon ?? undefined} domain={feed.link ?? ''} title={displayTitle} />
                        <div className="min-w-0">
                            <DialogTitle className="truncate text-base font-semibold">{headerTitle}</DialogTitle>
                            {headerDescription ? <DialogDescription className="truncate">{headerDescription}</DialogDescription> : null}
                        </div>
                    </div>
                </DialogHeader>
                <Form {...form}>
                    <form className="flex h-full grow flex-col" onSubmit={form.handleSubmit(onSubmit)}>
                        <div className="space-y-4 px-6">
                            <FormField
                                control={form.control}
                                name="memo"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>备注（可选）</FormLabel>
                                        <FormControl>
                                            <InputGroup className="flex-1">
                                                <InputGroupInput placeholder="自定义显示名称，留空则显示订阅源标题" {...field} />
                                                <InputGroupAddon align="inline-end">
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <InputGroupButton onClick={() => form.setValue('memo', form.getValues('title'))} size="icon-xs" type="button">
                                                                <i className="i-mingcute-signature-fill"></i>
                                                            </InputGroupButton>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>填充源标题</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </InputGroupAddon>
                                            </InputGroup>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormItem className="grid-cols-2 gap-x-4">
                                <FormField
                                    control={form.control}
                                    name="view"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>视图</FormLabel>
                                            <Select onValueChange={value => field.onChange(Number.parseInt(value, 10))} value={field.value.toString()}>
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
                                <FormField
                                    control={form.control}
                                    name="folderId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>文件夹</FormLabel>
                                            <Select
                                                onValueChange={value => field.onChange(value === 'none' ? null : Number.parseInt(value, 10))}
                                                value={field.value?.toString() ?? 'none'}
                                            >
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
                            </FormItem>
                            <FormField
                                control={form.control}
                                name="fetchFrequency"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>更新频率（分钟）</FormLabel>
                                        <FormControl>
                                            <Input
                                                min="1"
                                                placeholder="请输入更新频率"
                                                type="number"
                                                {...field}
                                                onChange={e => field.onChange(Number.parseInt(e.target.value, 10))}
                                                value={field.value}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <DialogFooter className="flex-none p-5">
                            <DialogClose asChild>
                                <Button type="button" variant="outline">
                                    取消
                                </Button>
                            </DialogClose>
                            <Button type="submit">保存</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
});

export const feedEditDialog = (feed: GetFeedsResult) => {
    return NiceModal.show(FeedEditDialog, { feed });
};
