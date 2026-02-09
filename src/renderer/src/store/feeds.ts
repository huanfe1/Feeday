import { create } from 'zustand';

import { useFolderStore } from './folders';
import { usePostStore } from './posts';

export type FeedType = {
    id: number;
    title: string;
    link: string;
    url: string;
    icon: string;
    hasUnread: boolean;
    fetchFrequency: number;
    folderId: number | null;
    view: number;
    lastFetchError: string | null;
};

interface UseFeedStore {
    feeds: FeedType[];
    selectedFeedId: number | null;
    setSelectedFeedId: (feedId: number | null) => void;
    getSelectedFeed: () => FeedType | null;
    refreshFeeds: () => void;
    deleteFeed: (feedId: number) => void;
    updateFeed: (feedId: number, data: Partial<FeedType>) => Promise<void>;
    updateFeedHasUnread: (feedId: number, hasUnread: boolean) => void;
}

export const useFeedStore = create<UseFeedStore>((set, get) => {
    const refreshFeeds = () => {
        window.electron.ipcRenderer.invoke('db-get-feeds').then(feeds => {
            console.log(feeds);
            set({ feeds: feeds || [] });
            useFolderStore.getState().refreshFolders();
        });
    };
    refreshFeeds();

    const getSelectFeed = () => {
        if (!get().selectedFeedId) return null;
        return get().feeds.find(feed => feed.id === get().selectedFeedId) || null;
    };

    return {
        feeds: [],
        selectedFeedId: null,
        setSelectedFeedId: feedId => set({ selectedFeedId: feedId }),
        getSelectedFeed: getSelectFeed,
        refreshFeeds,
        deleteFeed: feedId => {
            usePostStore.getState().setSelectedPost(null);
            get().setSelectedFeedId(null);
            window.electron.ipcRenderer.invoke('db-delete-feed', feedId).then(() => {
                set(state => ({
                    ...state,
                    feeds: state.feeds.filter(feed => feed.id !== feedId),
                }));
            });
        },
        updateFeed: async (feedId, data) => {
            return window.electron.ipcRenderer.invoke('db-update-feed', feedId, data).then(() => {
                set(state => ({
                    feeds: state.feeds.map(feed => (feed.id === feedId ? { ...feed, ...data } : feed)),
                }));
            });
        },
        updateFeedHasUnread: (feedId, hasUnread) => {
            set(state => {
                const feed = state.feeds.find(f => f.id === feedId);
                // 如果 feed 不存在或 hasUnread 值没有变化，则不更新
                if (!feed || feed.hasUnread === hasUnread) {
                    return state;
                }
                // 只有当值实际变化时才创建新的数组和对象
                return {
                    ...state,
                    feeds: state.feeds.map(f => (f.id === feedId ? { ...f, hasUnread: hasUnread } : f)),
                };
            });
        },
    };
});
