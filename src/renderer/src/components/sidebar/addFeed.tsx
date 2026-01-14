import { useFeedStore, useFolderStore } from '@/store';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const addFeedSchema = z.object({
    url: z.url('请输入正确的订阅源地址'),
    title: z.string().min(1, '请输入订阅源标题'),
    folder_id: z.number().nullable().optional(),
});

type AddFeedFormValues = z.infer<typeof addFeedSchema>;

type FeedInfo = {
    title: string;
    description?: string;
    link: string;
    url?: string;
    last_updated?: string;
    icon?: string;
    items: unknown[];
};

export default function AddFeed() {
    const [modalVisible, setModalVisible] = useState(false);
    const [isLoading, setLoading] = useState(false);
    const feedRef = useRef<FeedInfo | null>(null);
    const refreshFeeds = useFeedStore(state => state.refreshFeeds);
    const folders = useFolderStore(state => state.folders);
    const [hasTitle, setHasTitle] = useState(false);

    const form = useForm<AddFeedFormValues>({
        resolver: zodResolver(addFeedSchema),
        defaultValues: {
            url: '',
            title: '',
            folder_id: null,
        },
    });

    const getFeedInfo = async () => {
        const url = form.getValues('url');
        if (!url) {
            form.setError('url', { message: '请输入订阅源地址' });
            return;
        }

        // 验证 URL 格式
        const isValid = await form.trigger('url');
        if (!isValid) return;

        setLoading(true);
        window.electron.ipcRenderer
            .invoke('get-feed-info', url)
            .then((res: FeedInfo) => {
                feedRef.current = res;
                form.setValue('title', res.title);
                setHasTitle(true);
            })
            .catch(error => {
                toast.error('获取订阅源信息失败：' + error.message, { position: 'top-center', richColors: true });
            })
            .finally(() => {
                setLoading(false);
            });
    };

    const closeModal = () => {
        setModalVisible(false);
        setLoading(false);
        form.reset();
        feedRef.current = null;
        setHasTitle(false);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.handleSubmit((data: AddFeedFormValues) => {
            const feedInfo = feedRef.current;
            if (!feedInfo) {
                toast.error('请先获取订阅源信息', { position: 'top-center', richColors: true });
                return;
            }

            window.electron.ipcRenderer
                .invoke('db-insert-feed', {
                    title: data.title,
                    description: feedInfo.description || null,
                    link: feedInfo.link,
                    url: feedInfo.url ?? data.url,
                    last_updated: feedInfo.last_updated,
                    icon: feedInfo.icon || null,
                    folder_id: data.folder_id ?? null,
                })
                .then(feedId => {
                    if (feedInfo) {
                        feedInfo.items.forEach((post: unknown) => {
                            window.electron.ipcRenderer.invoke('db-insert-post', {
                                feed_id: feedId,
                                ...(post as Record<string, unknown>),
                            });
                        });
                    }
                    refreshFeeds();
                    closeModal();
                })
                .then(() => toast.success(`「${data.title}」添加订阅源成功`))
                .catch(error => {
                    console.log(error.message);
                    if (error.message.endsWith('Error: UNIQUE constraint failed: feeds.url')) {
                        toast.error('该订阅源地址已存在', { position: 'top-center', richColors: true });
                        return;
                    }
                    toast.error('添加订阅源失败：' + error.message, { position: 'top-center', richColors: true });
                });
        })();
    };

    // 当对话框关闭时重置表单
    useEffect(() => {
        if (!modalVisible) {
            form.reset();
            feedRef.current = null;
        }
    }, [modalVisible, form]);
    return (
        <Dialog open={modalVisible} onOpenChange={setModalVisible}>
            <Tooltip>
                <DialogTrigger asChild>
                    <Button variant="ghost" size="icon">
                        <TooltipTrigger asChild>
                            <i className="i-mingcute-add-fill text-base opacity-75"></i>
                        </TooltipTrigger>
                    </Button>
                </DialogTrigger>
                <TooltipContent sideOffset={10}>
                    <p>添加订阅源</p>
                </TooltipContent>
            </Tooltip>
            <DialogContent onCloseAutoFocus={closeModal} onPointerDownOutside={e => isLoading && e.preventDefault()}>
                <DialogHeader>
                    <DialogTitle>添加订阅源</DialogTitle>
                    <DialogDescription>输入订阅源地址以添加新的 RSS 订阅源</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="url"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>订阅源地址</FormLabel>
                                    <FormControl>
                                        <div className="flex w-full items-center gap-3">
                                            <InputGroup className="flex-1">
                                                <InputGroupAddon align="inline-end">
                                                    <InputGroupButton
                                                        onClick={() => {
                                                            form.setValue('url', '');
                                                            form.setValue('title', '');
                                                            feedRef.current = null;
                                                        }}
                                                        className="rounded-full"
                                                        size="icon-xs"
                                                        type="button"
                                                    >
                                                        <i className="i-mingcute-close-line"></i>
                                                    </InputGroupButton>
                                                </InputGroupAddon>
                                                <InputGroupInput type="text" placeholder="请输入订阅源地址" autoFocus {...field} />
                                            </InputGroup>
                                            <Button className="flex w-20 items-center" disabled={isLoading} onClick={getFeedInfo} type="button" variant="outline">
                                                {isLoading ? <Spinner /> : '获取'}
                                            </Button>
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        {hasTitle && (
                            <>
                                <FormField
                                    control={form.control}
                                    name="title"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>订阅源标题</FormLabel>
                                            <FormControl>
                                                <Input placeholder="请输入订阅源备注" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="folder_id"
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
                            </>
                        )}
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="outline">
                                    取消
                                </Button>
                            </DialogClose>
                            <Button type="submit" disabled={!hasTitle}>
                                确定
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
