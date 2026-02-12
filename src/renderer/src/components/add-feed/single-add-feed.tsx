import { useFeedStore, useFolderStore, usePostStore } from '@/store';
import { zodResolver } from '@hookform/resolvers/zod';
import type { FetchFeedResult, FetchFeedResultPost } from '@shared/types/ipc';
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

export function SingleAddFeed({ onClose }: { onClose: () => void }) {
    const [isLoading, setLoading] = useState(false);
    const feedRef = useRef<FetchFeedResult['feed'] | null>(null);
    const postsRef = useRef<FetchFeedResultPost[]>([]);
    const folders = useFolderStore(state => state.folders);

    const formSchema = z.object({
        url: z.url('请输入正确的订阅源地址').min(1, { message: '请输入订阅源地址' }),
        folderId: z.string().nullable(),
        view: z.string(),
        title: z.string().min(1, { message: '请输入订阅源标题' }).max(30, { message: '订阅源标题不能超过 30 个字符' }),
    });

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            url: '',
            folderId: null,
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
            const data = await window.electron.ipcRenderer.invoke('fetch-feed-info', url);
            form.setValue('title', data.feed.title ?? '');
            feedRef.current = data.feed;
            postsRef.current = data.posts ?? [];
        } catch (error: unknown) {
            if (error instanceof Error) {
                toast.error('获取订阅源信息失败：' + error.message, { position: 'top-center', richColors: true });
            }
        } finally {
            setLoading(false);
        }
    };

    async function onSubmit(values: z.infer<typeof formSchema>) {
        const feed = feedRef.current;
        const link = feed?.link ?? feed?.url ?? values.url;
        const params = {
            title: values.title,
            description: feed?.description,
            link,
            url: feed?.url ?? values.url,
            lastUpdated: feed?.lastUpdated,
            icon: feed?.icon,
            folderId: values.folderId ? Number(values.folderId) : undefined,
            view: Number(values.view),
        };

        try {
            const feedId = await window.electron.ipcRenderer.invoke('db-insert-feed', params);
            if (!feedId) {
                toast.error('该订阅源地址已存在', { position: 'top-center', richColors: true });
                return;
            }
            const tasks = postsRef.current
                .filter((post): post is FetchFeedResultPost & { title: string; link: string } => !!(post.title && post.link))
                .map(post => window.electron.ipcRenderer.invoke('db-insert-post', feedId, { ...post, title: post.title, link: post.link }));
            await Promise.all(tasks);

            useFeedStore.getState().refreshFeeds();
            usePostStore.getState().refreshPosts();

            onClose();
            toast.success(`「${values.title}」添加订阅源成功`);
        } catch (error: unknown) {
            if (error instanceof Error) {
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
        <form className="@container space-y-8" onReset={onReset} onSubmit={form.handleSubmit(onSubmit)}>
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
                                    <InputGroupInput autoFocus placeholder="请输入订阅源地址" type="text" {...field} />
                                </InputGroup>
                                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                            </Field>
                            <Field className={cn('col-span-3 flex flex-col items-start gap-2 space-y-0', fieldState.invalid ? 'self-center' : 'self-end')}>
                                <FieldLabel className="hidden w-auto!">Button</FieldLabel>
                                <Button className="w-full" disabled={isLoading} onClick={fetchFeed} type="button" variant="outline">
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
                            name="folderId"
                            render={({ field, fieldState }) => (
                                <Field className="col-span-6 col-start-auto flex flex-col items-start gap-2 space-y-0 self-end @3xl:col-span-6" data-invalid={fieldState.invalid}>
                                    <FieldLabel className="flex w-auto!">文件夹</FieldLabel>

                                    <Select key="select-0" name={field.name} onValueChange={field.onChange} value={field.value?.toString() ?? 'none'}>
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

                                    <Select key="select-1" name={field.name} onValueChange={field.onChange} value={field.value?.toString()}>
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
                <Button disabled={!title} type="submit">
                    确定
                </Button>
            </DialogFooter>
        </form>
    );
}
