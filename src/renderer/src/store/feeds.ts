import { create } from 'zustand';

export type FeedType = {
    id: number;
    title: string;
    link: string;
    url: string;
    icon: string;
    has_unread: boolean;
    fetch_frequency: number;
};

interface UseFeedStore {
    feeds: FeedType[];
    selectFeed: number | null;
    setSelectFeed: (feed_id: number | null) => void;
    getSelectFeed: () => FeedType | null;
    refreshFeeds: () => void;
    deleteFeed: (feed_id: number) => void;
    updateFeed: (data: { id: number } & Partial<FeedType>) => Promise<void>;
    updateFeedHasUnread: (feed_id: number, has_unread: boolean) => void;
}

export const useFeedStore = create<UseFeedStore>((set, get) => {
    const refreshFeeds = () => {
        window.electron.ipcRenderer.invoke('db-get-feeds').then(feeds => set({ feeds: feeds || [] }));
    };
    refreshFeeds();

    const getSelectFeed = () => {
        if (!get().selectFeed) return null;
        return get().feeds.find(feed => feed.id === get().selectFeed) || null;
    };

    return {
        feeds: [],
        selectFeed: null,
        setSelectFeed: feed_id => set({ selectFeed: feed_id }),
        getSelectFeed,
        refreshFeeds,
        deleteFeed: feed_id => {
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
            set(state => ({
                ...state,
                feeds: state.feeds.map(feed => (feed.id === feed_id ? { ...feed, has_unread } : feed)),
            }));
        },
    };
});
