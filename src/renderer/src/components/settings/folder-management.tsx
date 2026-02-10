import { useFeedStore, useFolderStore } from '@/store';
import { useState } from 'react';
import { toast } from 'sonner';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// 公共的校验函数
function validateFolderName(name: string): string | null {
    const trimmed = name.trim();
    if (!trimmed) {
        return '请输入文件夹名称';
    }
    if (trimmed.length > 50) {
        return '文件夹名称不能超过50个字符';
    }
    return null;
}

// 公共的错误处理函数
function handleFolderError(error: unknown, action: '创建' | '更新'): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('UNIQUE constraint failed')) {
        toast.error('文件夹名称已存在', { position: 'top-center', richColors: true });
    } else {
        toast.error(`${action}文件夹失败：${errorMessage}`, { position: 'top-center', richColors: true });
    }
}

// 通用的文件夹输入组件
function FolderInput({
    value,
    onChange,
    onSubmit,
    onCancel,
    placeholder = '请输入文件夹名称',
    buttonText = '创建',
    showButton = true,
    className = '',
}: {
    value: string;
    onChange: (value: string) => void;
    onSubmit: () => void;
    onCancel?: () => void;
    placeholder?: string;
    buttonText?: string;
    showButton?: boolean;
    className?: string;
}) {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            onSubmit();
        } else if (e.key === 'Escape' && onCancel) {
            onCancel();
        }
    };

    const handleBlur = () => {
        if (onCancel) {
            onCancel();
        }
    };

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <Input autoFocus onBlur={handleBlur} onChange={e => onChange(e.target.value)} onKeyDown={handleKeyDown} placeholder={placeholder} value={value} />
            {showButton && (
                <Button onClick={onSubmit} size="default">
                    {buttonText}
                </Button>
            )}
        </div>
    );
}

export default function FolderManagement() {
    const folders = useFolderStore(state => state.folders);
    const createFolder = useFolderStore(state => state.createFolder);
    const updateFolder = useFolderStore(state => state.updateFolder);
    const deleteFolder = useFolderStore(state => state.deleteFolder);
    const refreshFeeds = useFeedStore(state => state.refreshFeeds);

    const [folderName, setFolderName] = useState('');

    const handleAddFolder = () => {
        const error = validateFolderName(folderName);
        if (error) {
            toast.error(error, { position: 'top-center', richColors: true });
            return;
        }

        const name = folderName.trim();
        createFolder(name)
            .then(() => {
                refreshFeeds();
                toast.success(`文件夹「${name}」创建成功`, { position: 'top-center', richColors: true });
                setFolderName('');
            })
            .catch(error => handleFolderError(error, '创建'));
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">文件夹管理</h3>
            </div>
            <div className="mx-auto w-[60%] space-y-2">
                <FolderInput buttonText="创建" onChange={setFolderName} onSubmit={handleAddFolder} value={folderName} />
                {folders.length === 0 ? (
                    <div className="text-muted-foreground py-8 text-center text-sm">
                        <i className="i-mingcute-folder-line mb-2 block text-3xl"></i>
                        <p>暂无文件夹</p>
                    </div>
                ) : (
                    folders.map(folder => <FolderItem folder={folder} key={folder.id} onDelete={deleteFolder} onUpdate={updateFolder} refreshFeeds={refreshFeeds} />)
                )}
            </div>
        </div>
    );
}

function FolderItem({
    folder,
    onUpdate,
    onDelete,
    refreshFeeds,
}: {
    folder: { id: number; name: string };
    onUpdate: (id: number, name: string) => Promise<void>;
    onDelete: (id: number) => Promise<void>;
    refreshFeeds: () => void;
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [editName, setEditName] = useState(folder.name);

    const handleUpdate = () => {
        const error = validateFolderName(editName);
        if (error) {
            toast.error(error, { position: 'top-center', richColors: true });
            return;
        }

        const name = editName.trim();
        onUpdate(folder.id, name)
            .then(() => {
                refreshFeeds();
                toast.success('文件夹更新成功', { position: 'top-center', richColors: true });
                setIsEditing(false);
            })
            .catch(error => handleFolderError(error, '更新'));
    };

    const handleCancel = () => {
        setEditName(folder.name);
        setIsEditing(false);
    };

    const handleDelete = () => {
        onDelete(folder.id)
            .then(() => {
                refreshFeeds();
                toast.success('文件夹删除成功', { position: 'top-center', richColors: true });
                setShowDeleteDialog(false);
            })
            .catch(error => {
                toast.error('删除文件夹失败：' + error.message, { position: 'top-center', richColors: true });
            });
    };

    if (isEditing) {
        return (
            <div className="rounded-md border p-2">
                <FolderInput buttonText="保存" onCancel={handleCancel} onChange={setEditName} onSubmit={handleUpdate} value={editName} />
            </div>
        );
    }

    return (
        <>
            <div className="hover:bg-accent/50 flex items-center justify-between rounded-md border px-3 py-1">
                <div className="flex items-center gap-2">
                    <i className="i-mingcute-folder-fill text-muted-foreground"></i>
                    <span className="text-sm">{folder.name}</span>
                </div>
                <div className="flex items-center gap-1">
                    <Button onClick={() => setIsEditing(true)} size="icon-sm" variant="ghost">
                        <i className="i-mingcute-edit-line text-sm"></i>
                    </Button>
                    <Button onClick={() => setShowDeleteDialog(true)} size="icon-sm" variant="ghost">
                        <i className="i-mingcute-delete-line text-sm"></i>
                    </Button>
                </div>
            </div>
            <AlertDialog onOpenChange={setShowDeleteDialog} open={showDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>确定删除吗？</AlertDialogTitle>
                        <AlertDialogDescription>删除后，文件夹「{folder.name}」将被删除，其中的订阅源将变为未分类状态。</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete}>确定</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
