import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import { SettingsField } from './field';
import type { SettingsFieldType } from './field';

const fields: SettingsFieldType[] = [
    {
        type: 'input',
        id: 'avatarProxy',
        title: '头像代理地址',
        description: '设置头像代理地址，避免头像无法显示。',
        placeholder: 'https://unavatar.webp.se/${url}',
    },
    {
        type: 'input',
        id: 'rsshubSource',
        title: 'RSSHub 源地址',
        description: '设置 RSSHub 源地址，避免无法获取 RSS 源。',
        placeholder: 'https://rsshub.app',
    },
    {
        type: 'input',
        id: 'proxy',
        title: '代理地址',
        description: '设置代理地址，避免无法访问网络。',
        placeholder: 'http://127.0.0.1:7890',
    },
    {
        type: 'button',
        id: 'exportFeeds',
        title: '导出订阅源',
        description: '导出订阅源为 XML 文件。',
        label: '导出',
        onClick: () => {
            console.log('export feeds');
        },
    },
];

export default function Settings() {
    const [modalVisible, setModalVisible] = useState(false);

    const closeModal = () => {
        setModalVisible(false);
    };

    return (
        <Dialog onOpenChange={setModalVisible} open={modalVisible}>
            <Tooltip>
                <DialogTrigger asChild>
                    <Button size="icon" variant="ghost">
                        <TooltipTrigger asChild>
                            <i className="i-mingcute-settings-3-fill text-lg opacity-75"></i>
                        </TooltipTrigger>
                    </Button>
                </DialogTrigger>
                <TooltipContent sideOffset={10}>
                    <p>设置</p>
                </TooltipContent>
            </Tooltip>
            <DialogContent className="min-h-[70vh] max-w-none px-0 sm:w-225 sm:max-w-none" onCloseAutoFocus={closeModal}>
                <div>
                    <DialogHeader className="px-6">
                        <DialogTitle>设置</DialogTitle>
                        <DialogDescription>管理您的设置</DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="max-h-[calc(100vh-12rem)] flex-1 overflow-y-auto">
                        <SettingsField fields={fields} />
                    </ScrollArea>
                </div>
            </DialogContent>
        </Dialog>
    );
}
