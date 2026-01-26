import { create } from 'zustand';

export type FolderType = {
    id: number;
    name: string;
};

interface UseFolderStore {
    folders: FolderType[];
    selectedFolderId: number | null;

    setSelectedFolderId: (folder_id: number | null) => void;
    getSelectedFolder: () => FolderType | null;
    refreshFolders: () => void;
    createFolder: (name: string) => Promise<number>;
    updateFolder: (id: number, name: string) => Promise<void>;
    deleteFolder: (id: number) => Promise<void>;
}

export const useFolderStore = create<UseFolderStore>((set, get) => {
    const refreshFolders = () => {
        window.electron.ipcRenderer.invoke('db-get-folders').then(folders => set({ folders: folders || [] }));
    };
    refreshFolders();

    return {
        folders: [],
        selectedFolderId: null,
        setSelectedFolderId: folder_id => set({ selectedFolderId: folder_id }),
        getSelectedFolder: () => get().folders.find(folder => folder.id === get().selectedFolderId) || null,
        refreshFolders,
        createFolder: async (name: string) => {
            const result = await window.electron.ipcRenderer.invoke('db-insert-folder', name);
            get().refreshFolders();
            return result.lastInsertRowid;
        },
        updateFolder: async (id: number, name: string) => {
            await window.electron.ipcRenderer.invoke('db-update-folder', id, name);
            set(state => ({
                folders: state.folders.map(folder => (folder.id === id ? { ...folder, name } : folder)),
            }));
        },
        deleteFolder: async (id: number) => {
            await window.electron.ipcRenderer.invoke('db-delete-folder', id);
            set(state => ({
                folders: state.folders.filter(folder => folder.id !== id),
            }));
        },
    };
});
