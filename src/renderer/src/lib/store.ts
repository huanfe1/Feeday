import { create } from 'zustand';

type Feed = {
    id: number;
    title: string;
    link: string;
    url: string;
    icon: string;
    has_unread: boolean;
};

interface UseFeed {
    feeds: Feed[];
    currentFeed: Feed | null;
    setCurrentFeed: (feed: Feed | null) => void;
    refreshFeeds: () => void;
}

export const useFeed = create<UseFeed>(set => {
    const refreshFeeds = () => {
        window.electron.ipcRenderer.invoke('db-get-feeds').then(feeds => set({ feeds: feeds || [] }));
    };
    refreshFeeds();
    return {
        feeds: [],
        currentFeed: null,
        setCurrentFeed: feed => set({ currentFeed: feed }),
        refreshFeeds,
    };
});

type Post = {
    id: number;
    title: string;
    link: string;
    author: string;
    image_url: string;
    summary: string;
    is_read: boolean;
    pub_date: string;
};

interface UsePost {
    posts: Post[];
    currentPost: Post | null;
    setCurrentPost: (post: Post | null) => void;
    refreshPosts: (feed_id?: number, onlyUnread?: boolean) => void;
}

export const usePost = create<UsePost>(set => {
    const updateReadPostById = (post_id: number, is_read: boolean) => {
        window.electron.ipcRenderer.invoke('db-update-read-post-by-id', Number(post_id), is_read);
    };

    return {
        posts: [],
        currentPost: null,
        setCurrentPost: post => {
            if (post?.id) {
                post.is_read = true;
                // updateReadPostById(Number(post.id), true);
            }
            return set({ currentPost: post });
        },
        refreshPosts: (feed_id?: number, onlyUnread?: boolean) => {
            console.log('refreshPosts', feed_id, onlyUnread);
            if (feed_id) {
                window.electron.ipcRenderer.invoke('db-get-posts-by-id', feed_id, onlyUnread).then(posts => {
                    set({ posts: posts || [] });
                });
            } else {
                window.electron.ipcRenderer.invoke('db-get-posts', onlyUnread).then(posts => set({ posts: posts || [] }));
            }
        },
    };
});
