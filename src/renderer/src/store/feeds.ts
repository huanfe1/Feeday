import { create } from 'zustand';

export type FeedType = {
    id: number;
    title: string;
    link: string;
    url: string;
    icon: string;
    has_unread: boolean;
};

interface UseFeedStore {
    feeds: FeedType[];
    currentFeed: FeedType | null;
    setCurrentFeed: (feed_id: number | null) => void;
    refreshFeeds: () => void;
    updateFeedHasUnread: (feed_id: number, has_unread: boolean) => void;
}

export const useFeedStore = create<UseFeedStore>((set, get) => {
    const refreshFeeds = () => {
        window.electron.ipcRenderer.invoke('db-get-feeds').then(feeds => set({ feeds: feeds || [] }));
    };
    refreshFeeds();
    return {
        feeds: [],
        currentFeed: null,
        setCurrentFeed: feed_id => {
            if (!feed_id) return set({ currentFeed: null });
            return set({ currentFeed: get().feeds.find(feed => feed.id === feed_id) || null });
        },
        refreshFeeds,
        updateFeedHasUnread: (feed_id, has_unread) => {
            set(state => ({
                ...state,
                feeds: state.feeds.map(feed => (feed.id === feed_id ? { ...feed, has_unread } : feed)),
                currentFeed: state.currentFeed && state.currentFeed.id === feed_id ? { ...state.currentFeed, has_unread } : state.currentFeed,
            }));
        },
    };
});
