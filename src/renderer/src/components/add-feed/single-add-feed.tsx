import { useFeedStore, useFolderStore, usePostStore } from '@/store';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { DialogClose, DialogFooter } from '@/components/ui/dialog';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

type FeedInfo = {
    title: string;
    description?: string;
    link: string;
    url?: string;
    last_updated?: string;
    icon?: string;
    items?: unknown[];
};

export function SingleAddFeed({ onClose }: { onClose: () => void }) {
    const [isLoading, setLoading] = useState(false);
    const feedRef = useRef<FeedInfo | null>(null);
    const folders = useFolderStore(state => state.folders);

    const formSchema = z.object({
        url: z.url('请输入正确的订阅源地址').min(1, { message: '请输入订阅源地址' }),
        folder_id: z.string().nullable(),
        view: z.string(),
        title: z.string().min(1, { message: '请输入订阅源标题' }).max(30, { message: '订阅源标题不能超过 30 个字符' }),
    });

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            url: '',
            folder_id: null,
            view: '1',
            title: '',
        },
    });

    const title = useWatch({ control: form.control, name: 'title' });

    const fetchFeed = async () => {
        const isValid = await form.trigger('url');
        if (!isValid) return;

        const url = form.getValues('url');
        setLoading(true);

        try {
            const res = await window.electron.ipcRenderer.invoke('fetch-feed-info', url);
            form.setValue('title', res.title);
            feedRef.current = res;
        } catch (error: unknown) {
            if (error instanceof Error) {
                toast.error('获取订阅源信息失败：' + error.message, { position: 'top-center', richColors: true });
            }
        } finally {
            setLoading(false);
        }
    };

    async function onSubmit(values: z.infer<typeof formSchema>) {
        const params = {
            title: values.title,
            description: feedRef.current?.description || null,
            link: feedRef.current?.link,
            url: feedRef.current?.url ?? values.url,
            last_updated: feedRef.current?.last_updated,
            icon: feedRef.current?.icon || null,
            folder_id: values.folder_id ? Number(values.folder_id) : null,
            view: Number(values.view),
        };

        try {
            const feedId = await window.electron.ipcRenderer.invoke('db-insert-feed', params);
            const tasks = (feedRef.current?.items || []).map((post: unknown) => window.electron.ipcRenderer.invoke('db-insert-post', feedId, post));
            await Promise.all(tasks);

            useFeedStore.getState().refreshFeeds();
            usePostStore.getState().refreshPosts();

            onClose();
            toast.success(`「${values.title}」添加订阅源成功`);
        } catch (error: unknown) {
            if (error instanceof Error) {
                if (error.message.endsWith('Error: UNIQUE constraint failed: feeds.url')) {
                    toast.error('该订阅源地址已存在', { position: 'top-center', richColors: true });
                    return;
                }
                toast.error('添加订阅源失败：' + error.message, { position: 'top-center', richColors: true });
            }
        }
    }

    function onReset() {
        form.reset();
        form.clearErrors();
        feedRef.current = null;
    }

    return (
        <form className="@container space-y-8" onSubmit={form.handleSubmit(onSubmit)} onReset={onReset}>
            <div className="grid grid-cols-12 gap-4">
                <Controller
                    control={form.control}
                    name="url"
                    render={({ field, fieldState }) => (
                        <>
                            <Field className="col-span-9 flex flex-col items-start gap-2 space-y-0" data-invalid={fieldState.invalid}>
                                <FieldLabel className="flex w-auto! @3xl:flex">订阅源地址</FieldLabel>
                                <InputGroup className="flex-1">
                                    <InputGroupAddon align="inline-end">
                                        <InputGroupButton className="rounded-full" onClick={onReset} size="icon-xs" type="button">
                                            <i className="i-mingcute-close-line"></i>
                                        </InputGroupButton>
                                    </InputGroupAddon>
                                    <InputGroupInput type="text" placeholder="请输入订阅源地址" autoFocus {...field} />
                                </InputGroup>
                                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                            </Field>
                            <Field className={cn('col-span-3 flex flex-col items-start gap-2 space-y-0', fieldState.invalid ? 'self-center' : 'self-end')}>
                                <FieldLabel className="hidden w-auto!">Button</FieldLabel>
                                <Button className="w-full" disabled={isLoading} type="button" variant="outline" onClick={fetchFeed}>
                                    {isLoading ? <Spinner /> : '获取'}
                                </Button>
                            </Field>
                        </>
                    )}
                />
                {title && (
                    <>
                        <Controller
                            control={form.control}
                            name="title"
                            render={({ field, fieldState }) => (
                                <Field className="col-span-12 col-start-auto flex flex-col items-start gap-2 space-y-0 self-end @3xl:col-span-12" data-invalid={fieldState.invalid}>
                                    <FieldLabel className="flex w-auto!">订阅源标题</FieldLabel>
                                    <Input className="" key="text-input-0" placeholder="" type="text" {...field} />
                                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                                </Field>
                            )}
                        />
                        <Controller
                            control={form.control}
                            name="folder_id"
                            render={({ field, fieldState }) => (
                                <Field className="col-span-6 col-start-auto flex flex-col items-start gap-2 space-y-0 self-end @3xl:col-span-6" data-invalid={fieldState.invalid}>
                                    <FieldLabel className="flex w-auto!">文件夹</FieldLabel>

                                    <Select key="select-0" value={field.value?.toString() ?? 'none'} name={field.name} onValueChange={field.onChange}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem key="none" value="none">
                                                未分类
                                            </SelectItem>
                                            {folders.map(folder => (
                                                <SelectItem key={folder.id} value={folder.id.toString()}>
                                                    {folder.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                                </Field>
                            )}
                        />
                        <Controller
                            control={form.control}
                            name="view"
                            render={({ field, fieldState }) => (
                                <Field className="col-span-6 col-start-auto flex flex-col items-start gap-2 space-y-0 self-end @3xl:col-span-6" data-invalid={fieldState.invalid}>
                                    <FieldLabel className="flex w-auto!">视图</FieldLabel>

                                    <Select key="select-1" value={field.value?.toString()} name={field.name} onValueChange={field.onChange}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem key="1" value="1">
                                                文章
                                            </SelectItem>

                                            <SelectItem key="2" value="2">
                                                媒体
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>

                                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                                </Field>
                            )}
                        />
                    </>
                )}
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button type="button" variant="outline">
                        取消
                    </Button>
                </DialogClose>
                <Button type="submit" disabled={!title}>
                    确定
                </Button>
            </DialogFooter>
        </form>
    );
}
