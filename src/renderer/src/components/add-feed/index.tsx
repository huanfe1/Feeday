import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import { BatchImportFeed } from './batch-import-feed';
import { SingleAddFeed } from './single-add-feed';

export default function AddFeed() {
    const [modalVisible, setModalVisible] = useState(false);
    const [isImporting, setIsImporting] = useState(false);

    const closeModal = () => {
        if (!isImporting) {
            setModalVisible(false);
        }
    };

    const handleOpenChange = (open: boolean) => {
        if (!isImporting) {
            setModalVisible(open);
        }
    };

    return (
        <Dialog onOpenChange={handleOpenChange} open={modalVisible}>
            <Tooltip>
                <DialogTrigger asChild>
                    <Button size="icon" variant="ghost">
                        <TooltipTrigger asChild>
                            <i className="i-mingcute-add-fill text-base opacity-75"></i>
                        </TooltipTrigger>
                    </Button>
                </DialogTrigger>
                <TooltipContent sideOffset={10}>
                    <p>添加订阅源</p>
                </TooltipContent>
            </Tooltip>
            <DialogContent
                onCloseAutoFocus={closeModal}
                onEscapeKeyDown={e => {
                    if (isImporting) {
                        e.preventDefault();
                    }
                }}
                onInteractOutside={e => {
                    if (isImporting) {
                        e.preventDefault();
                    }
                }}
                showCloseButton={!isImporting}
            >
                <DialogHeader>
                    <DialogTitle>添加订阅源</DialogTitle>
                    <DialogDescription></DialogDescription>
                </DialogHeader>
                <Tabs defaultValue="single">
                    <TabsList className="mb-2 w-full">
                        <TabsTrigger disabled={isImporting} value="single">
                            单个添加
                        </TabsTrigger>
                        <TabsTrigger disabled={isImporting} value="multiple">
                            批量导入
                        </TabsTrigger>
                    </TabsList>
                    <TabsContent value="single">
                        <SingleAddFeed onClose={closeModal} />
                    </TabsContent>
                    <TabsContent value="multiple">
                        <BatchImportFeed isImporting={isImporting} onClose={closeModal} setIsImporting={setIsImporting} />
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
