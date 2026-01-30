import { create } from 'zustand';

import { useFolderStore } from './folders';
import { usePostStore } from './posts';

export type FeedType = {
    id: number;
    title: string;
    link: string;
    url: string;
    icon: string;
    has_unread: boolean;
    fetch_frequency: number;
    folder_id: number | null;
    view: number;
    last_fetch_error: string | null;
};

interface UseFeedStore {
    feeds: FeedType[];
    selectedFeedId: number | null;
    setSelectedFeedId: (feed_id: number | null) => void;
    getSelectedFeed: () => FeedType | null;
    refreshFeeds: () => void;
    deleteFeed: (feed_id: number) => void;
    updateFeed: (data: { id: number } & Partial<FeedType>) => Promise<void>;
    updateFeedHasUnread: (feed_id: number, has_unread: boolean) => void;
}

export const useFeedStore = create<UseFeedStore>((set, get) => {
    const refreshFeeds = () => {
        window.electron.ipcRenderer.invoke('db-get-feeds').then(feeds => {
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
        setSelectedFeedId: feed_id => set({ selectedFeedId: feed_id }),
        getSelectedFeed: getSelectFeed,
        refreshFeeds,
        deleteFeed: feed_id => {
            usePostStore.getState().setSelectedPost(null);
            get().setSelectedFeedId(null);
            window.electron.ipcRenderer.invoke('db-delete-feed', feed_id).then(() => {
                set(state => ({
                    ...state,
                    feeds: state.feeds.filter(feed => feed.id !== feed_id),
                }));
            });
        },
        updateFeed: async data => {
            return window.electron.ipcRenderer.invoke('db-update-feed', data).then(() => {
                set(state => ({
                    feeds: state.feeds.map(feed => (feed.id === data.id ? { ...feed, ...data } : feed)),
                }));
            });
        },
        updateFeedHasUnread: (feed_id, has_unread) => {
            set(state => {
                const feed = state.feeds.find(f => f.id === feed_id);
                // 如果 feed 不存在或 has_unread 值没有变化，则不更新
                if (!feed || feed.has_unread === has_unread) {
                    return state;
                }
                // 只有当值实际变化时才创建新的数组和对象
                return {
                    ...state,
                    feeds: state.feeds.map(f => (f.id === feed_id ? { ...f, has_unread } : f)),
                };
            });
        },
    };
});
