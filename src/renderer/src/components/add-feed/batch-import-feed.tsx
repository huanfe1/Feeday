import { useFeedStore } from '@/store';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { DialogClose, DialogFooter } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';

export function BatchImportFeed({ onClose, isImporting, setIsImporting }: { onClose: () => void; isImporting: boolean; setIsImporting: (value: boolean) => void }) {
    const [isDragging, setIsDragging] = useState(false);
    const refreshFeeds = useFeedStore(state => state.refreshFeeds);

    // 监听 OPML 导入完成事件
    useEffect(() => {
        const handleComplete = (_event: unknown, data: { insertedFeeds: number }) => {
            setIsImporting(false);
            refreshFeeds();
            toast.success(`成功导入 ${data.insertedFeeds} 个订阅源`, { position: 'top-center', richColors: true });
            onClose();
        };

        const removeListener = window.electron.ipcRenderer.on('opml-import-complete', handleComplete);
        return () => removeListener();
    }, [refreshFeeds, onClose, setIsImporting]);

    const processOPMLContent = async (content: string) => {
        try {
            // 解析 OPML 内容
            const parseResult = await window.electron.ipcRenderer.invoke('opml-parse-content', content);
            if (!parseResult.success) {
                toast.error('解析 OPML 文件失败：' + parseResult.error, { position: 'top-center', richColors: true });
                setIsImporting(false);
                return;
            }

            if (parseResult.feeds.length === 0) {
                toast.error('OPML 文件中没有找到订阅源', { position: 'top-center', richColors: true });
                setIsImporting(false);
                return;
            }

            setIsImporting(true);
            // 批量导入（异步，完成后会通过事件通知）
            await window.electron.ipcRenderer.invoke('import-opml-feeds', parseResult.feeds);
        } catch (error) {
            setIsImporting(false);
            toast.error('导入 OPML 失败：' + (error instanceof Error ? error.message : String(error)), {
                position: 'top-center',
                richColors: true,
            });
        }
    };

    const handleImportOPML = async () => {
        try {
            const filePath = await window.electron.ipcRenderer.invoke('opml-select-file-dialog');
            if (!filePath) return;

            const content = await window.electron.ipcRenderer.invoke('fs-read-file', filePath);
            await processOPMLContent(content);
        } catch (error) {
            toast.error('导入 OPML 失败：' + (error instanceof Error ? error.message : String(error)), {
                position: 'top-center',
                richColors: true,
            });
        }
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const files = Array.from(e.dataTransfer.files);
        const opmlFile = files.find(file => /\.(opml|xml)$/i.test(file.name));

        if (!opmlFile) {
            toast.error('请拖拽 .opml 或 .xml 格式的文件', { position: 'top-center', richColors: true });
            return;
        }

        try {
            const content = await opmlFile.text();
            await processOPMLContent(content);
        } catch (error) {
            toast.error('读取文件失败：' + (error instanceof Error ? error.message : String(error)), { position: 'top-center', richColors: true });
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    return (
        <div className="space-y-4">
            {isImporting ? (
                <div className="rounded-lg border border-dashed px-6 py-12 text-center">
                    <div className="mb-4 flex items-center justify-center">
                        <Spinner className="mr-2" />
                        <span className="text-sm font-medium">正在导入订阅源...</span>
                    </div>
                    <p className="text-muted-foreground text-xs">请稍候，导入完成后会自动关闭</p>
                </div>
            ) : (
                <div
                    className={`rounded-lg border border-dashed py-12 text-center transition-colors select-none ${
                        isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    <i className={`i-mingcute-file-upload-line mb-3 text-4xl transition-colors ${isDragging ? 'text-primary' : 'text-muted-foreground'}`}></i>
                    <p className="text-muted-foreground mb-2 text-sm">{isDragging ? '松开鼠标以导入文件' : '拖拽 OPML 文件到此处或点击下方按钮选择文件'}</p>
                    <p className="text-muted-foreground/70 text-xs">支持 .opml 和 .xml 格式</p>
                </div>
            )}
            <DialogFooter>
                <DialogClose asChild>
                    <Button type="button" variant="outline" disabled={isImporting}>
                        取消
                    </Button>
                </DialogClose>
                <Button type="button" onClick={handleImportOPML} disabled={isImporting}>
                    {isImporting ? (
                        <>
                            <Spinner className="mr-2" />
                            导入中...
                        </>
                    ) : (
                        '选择文件并导入'
                    )}
                </Button>
            </DialogFooter>
        </div>
    );
}
