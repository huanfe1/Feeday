import { useFeedStore } from '@/store';
import { useState } from 'react';
import { toast } from 'sonner';

import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

export function BatchImportFeed({ isImporting, setIsImporting }: { onClose: () => void; isImporting: boolean; setIsImporting: (value: boolean) => void }) {
    const [isDragging, setIsDragging] = useState(false);

    const parseContent = async (content: string) => {
        setIsImporting(true);
        window.electron.ipcRenderer
            .invoke('opml-import-from-content', content)
            .then(results => {
                const messages = results.filter(result => result.status === 'fulfilled').map(result => result.value);
                console.log(messages);
                toast.success(`成功导入 ${messages.filter(message => message.success).length} 个订阅源`, { position: 'top-center', richColors: true });
                useFeedStore.getState().refreshFeeds();
            })
            .catch(err => {
                toast.error(err?.message ?? '导入失败', { position: 'top-center', richColors: true });
            })
            .finally(() => {
                setIsImporting(false);
            });
    };

    const handleClick = async () => {
        const content = await window.electron.ipcRenderer.invoke('opml-select-file-dialog');
        content && parseContent(content);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = Array.from(e.dataTransfer.files);
        const opmlFile = files.find(file => /\.(opml|xml)$/i.test(file.name));

        if (!opmlFile) {
            toast.error('请拖拽 .opml 或 .xml 格式的文件', { position: 'top-center', richColors: true });
            return;
        }

        const content = await opmlFile.text();
        content && parseContent(content);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        e.preventDefault();
        setIsDragging(false);
    };

    return (
        <div
            className={cn(
                'flex h-70 items-center justify-center rounded-lg border border-dashed transition-colors select-none',
                isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
            )}
            onClick={handleClick}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            {!isImporting ? (
                <div className="flex flex-col items-center">
                    <i className={`i-mingcute-file-upload-line mb-2 text-4xl transition-colors ${isDragging ? 'text-primary' : 'text-muted-foreground'}`}></i>
                    <p className="text-muted-foreground mb-2 text-sm">{isDragging ? '松开鼠标以导入文件' : '拖拽 OPML 文件到此处或点击选择文件'}</p>
                    <p className="text-muted-foreground/70 text-xs">支持 .opml 和 .xml 格式</p>
                </div>
            ) : (
                <div className="text-muted-foreground flex items-center">
                    <Spinner className="mr-2" />
                    <span className="text-sm">正在导入订阅源...</span>
                </div>
            )}
        </div>
    );
}
