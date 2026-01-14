import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import FolderManagement from './folder-management';

export default function Settings() {
    const [modalVisible, setModalVisible] = useState(false);

    const closeModal = () => {
        setModalVisible(false);
    };

    return (
        <Dialog open={modalVisible} onOpenChange={setModalVisible}>
            <Tooltip>
                <DialogTrigger asChild>
                    <Button variant="ghost" size="icon">
                        <TooltipTrigger asChild>
                            <i className="i-mingcute-settings-3-fill text-lg opacity-75"></i>
                        </TooltipTrigger>
                    </Button>
                </DialogTrigger>
                <TooltipContent sideOffset={10}>
                    <p>设置</p>
                </TooltipContent>
            </Tooltip>
            <DialogContent className="max-h-[80vh] w-[60vw] max-w-none sm:max-w-none" onCloseAutoFocus={closeModal}>
                <div className="flex max-h-[70vh] flex-col gap-4">
                    <DialogHeader>
                        <DialogTitle>设置</DialogTitle>
                        <DialogDescription>管理您的文件夹和订阅源设置</DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="flex-1 pr-4">
                        <div className="space-y-6">
                            <FolderManagement />
                        </div>
                    </ScrollArea>
                </div>
            </DialogContent>
        </Dialog>
    );
}
