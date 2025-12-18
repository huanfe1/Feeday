import dayjs from 'dayjs';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group';
import { Label } from '@/components/ui/label';

export default function AddFeed() {
    const [feedUrl, setFeedUrl] = useState('');
    const [feedInfo, setFeedInfo] = useState<{}>({});
    const getFeedInfo = () => {
        if (!feedUrl) return;
        // 检查 feedUrl 是否为合法网址
        const urlPattern = /^(https?:\/\/)[^\s/$.?#].[^\s]*$/i;
        if (!urlPattern.test(feedUrl)) {
            toast.error('请输入正确的网址', { position: 'top-center', richColors: true });
            return;
        }
        window.electron.ipcRenderer.invoke('get-feed-info', feedUrl).then(res => {
            console.log(res);
            setFeedInfo(res);
        });
    };
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
                    <i className="i-mingcute-add-fill text-base opacity-75"></i>
                </Button>
            </DialogTrigger>
            <DialogContent>
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
                                    <InputGroupButton onClick={() => setFeedUrl('')} className="rounded-full" size="icon-xs">
                                        <i className="i-mingcute-close-line"></i>
                                    </InputGroupButton>
                                </InputGroupAddon>
                                <InputGroupInput type="text" id="feedUrl" placeholder="请输入订阅源地址" value={feedUrl} onChange={e => setFeedUrl(e.target.value)} />
                            </InputGroup>
                            <Button className="flex w-20 items-center" onClick={getFeedInfo} type="submit" variant="outline">
                                <span>获取</span>
                            </Button>
                        </div>
                        <div className="mt-5">
                            <Label htmlFor="feedTitle" className="mb-2">
                                订阅源标题
                            </Label>
                            <Input type="text" id="feedTitle" placeholder="请输入订阅源标题" value={feedInfo.title} />
                        </div>
                        <div className="mt-5">
                            <Label htmlFor="feedNote" className="mb-2">
                                上次更新时间
                            </Label>
                            <Input
                                type="text"
                                disabled
                                id="lastUpdateTime"
                                readOnly
                                placeholder="请输入上次更新时间"
                                value={dayjs(feedInfo.lastBuildDate).format('YYYY-MM-DD HH:mm:ss')}
                            />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">取消</Button>
                    </DialogClose>
                    <Button type="submit">确定</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
