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
        <Dialog open={modalVisible} onOpenChange={handleOpenChange}>
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
            <DialogContent
                onCloseAutoFocus={closeModal}
                onInteractOutside={e => {
                    if (isImporting) {
                        e.preventDefault();
                    }
                }}
                onEscapeKeyDown={e => {
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
                        <TabsTrigger value="single" disabled={isImporting}>
                            单个添加
                        </TabsTrigger>
                        <TabsTrigger value="multiple" disabled={isImporting}>
                            批量导入
                        </TabsTrigger>
                    </TabsList>
                    <TabsContent value="single">
                        <SingleAddFeed onClose={closeModal} />
                    </TabsContent>
                    <TabsContent value="multiple">
                        <BatchImportFeed onClose={closeModal} isImporting={isImporting} setIsImporting={setIsImporting} />
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
