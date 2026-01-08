import { create } from 'zustand';

type Feed = {
    id: number;
    title: string;
    link: string;
    url: string;
    icon: string;
    has_unread: boolean;
};

interface UseFeedStore {
    feeds: Feed[];
    currentFeed: Feed | null;
    setCurrentFeed: (feed_id: number | null) => void;
    refreshFeeds: () => void;
}

export const useFeedStore = create<UseFeedStore>((set, get) => {
    const refreshFeeds = () => {
        console.log('refreshFeeds');
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
    };
});
