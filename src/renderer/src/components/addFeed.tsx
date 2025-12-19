import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

type Feed = {
    title: string;
    link: string;
    note: string;
};

export default function AddFeed() {
    const [modalVisible, setModalVisible] = useState(false);
    const [isLoading, setLoading] = useState(false);
    const feedRef = useRef<any>(null);

    const [feed, setFeed] = useState<Feed>({ title: '', link: '', note: '' });

    const getFeedInfo = () => {
        if (!feed.link) return;
        const urlPattern = /^(https?:\/\/)[^\s/$.?#].[^\s]*$/i;
        if (!urlPattern.test(feed.link)) {
            toast.error('请输入正确的网址', { position: 'top-center', richColors: true });
            return;
        }
        setLoading(true);
        window.electron.ipcRenderer
            .invoke('get-feed-info', feed.link)
            .then(res => {
                feedRef.current = res;
                if (res.title) {
                    setFeed(value => ({ ...value, title: res.title, note: res.title }));
                }
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
        setFeed({ title: '', link: '', note: '' });
        feedRef.current = null;
    };
    const submit = () => {
        if (!feed.title) return;
        window.electron.ipcRenderer
            .invoke('db-insert-feed', {
                title: feedRef.current.title,
                note: feed.note,
                description: feedRef.current.description,
                htmlUrl: feedRef.current.link,
                xmlUrl: feed.link,
            })
            .then(feedId => {
                setModalVisible(false);
                feedRef.current.items.forEach(post => {
                    window.electron.ipcRenderer.invoke('db-insert-post', {
                        feedId: feedId,
                        title: post.title,
                        link: post.link,
                        author: post.author,
                        summary: post.summary,
                        pubDate: post.pubDate,
                        content: post.content,
                    });
                });
            })
            .catch(error => {
                toast.error('添加订阅源失败：' + error.message, { position: 'top-center', richColors: true });
            });
    };
    return (
        <Dialog open={modalVisible} onOpenChange={setModalVisible}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
                    <i className="i-mingcute-add-fill text-base opacity-75"></i>
                </Button>
            </DialogTrigger>
            <DialogContent onCloseAutoFocus={closeModal} onPointerDownOutside={e => e.preventDefault()}>
                <DialogHeader>
                    <DialogTitle>添加订阅源</DialogTitle>
                </DialogHeader>
                <div className="my-5">
                    <div>
                        <Label htmlFor="feedUrl" className="mb-2">
                            订阅源地址
                        </Label>
                        <div className="flex w-full items-center gap-3">
                            <InputGroup>
                                <InputGroupAddon align="inline-end">
                                    <InputGroupButton
                                        onClick={() => {
                                            setFeed(value => ({ ...value, link: '' }));
                                        }}
                                        className="rounded-full"
                                        size="icon-xs"
                                    >
                                        <i className="i-mingcute-close-line"></i>
                                    </InputGroupButton>
                                </InputGroupAddon>
                                <InputGroupInput
                                    type="text"
                                    id="feedUrl"
                                    placeholder="请输入订阅源地址"
                                    value={feed.link}
                                    onChange={e => setFeed(value => ({ ...value, link: e.target.value }))}
                                />
                            </InputGroup>
                            <Button className="flex w-20 items-center" disabled={isLoading} onClick={getFeedInfo} type="submit" variant="outline">
                                {isLoading ? <Spinner /> : '获取'}
                            </Button>
                        </div>
                        {feed.title && (
                            <>
                                <div className="mt-5">
                                    <Label htmlFor="feedNote" className="mb-2">
                                        订阅源标题
                                    </Label>
                                    <Input
                                        type="text"
                                        id="feedNote"
                                        placeholder="请输入订阅源备注"
                                        value={feed.note}
                                        onChange={e => setFeed(value => ({ ...value, note: e.target.value }))}
                                    />
                                </div>
                            </>
                        )}
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">取消</Button>
                    </DialogClose>
                    <Button onClick={submit} type="submit" disabled={!feed.title}>
                        确定
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
