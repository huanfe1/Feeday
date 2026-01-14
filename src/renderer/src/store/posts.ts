import { create } from 'zustand';

import { useFeedStore } from './feeds';

export type PostType = {
    id: number;
    title: string;
    link: string;
    author: string;
    image_url: string;
    summary: string;
    is_read: boolean;
    pub_date: string;
    feed_id: number;
};

interface UsePostStore {
    posts: PostType[];
    currentPostId: number | null;
    setCurrentPost: (post_id: number | null) => void;
    getCurrentPost: () => PostType | null;
    refreshPosts: (feed_id?: number, onlyUnread?: boolean) => void;
    readAllPosts: (feed_id?: number) => void;
    updatePostReadById: (post_id: number, is_read: boolean) => void;
}

export const usePostStore = create<UsePostStore>((set, get) => {
    const getCurrentPost = () => {
        if (!get().currentPostId) return null;
        return get().posts.find(post => post.id === get().currentPostId) || null;
    };

    const updatePostReadById = (post_id: number, is_read: boolean = true) => {
        window.electron.ipcRenderer.invoke('db-update-post-read-by-id', Number(post_id), is_read).then(() => {
            const posts = get().posts.map(p => (p.id === post_id ? { ...p, is_read } : p));
            set({ posts });

            const updatedPost = posts.find(p => p.id === post_id);
            if (!updatedPost) return;

            const feedId = updatedPost.feed_id;
            const feedStore = useFeedStore.getState();
            const feed = feedStore.feeds.find(f => f.id === feedId);
            if (!feed) return;

            const currentHasUnread = feed.has_unread;

            if (is_read) {
                if (currentHasUnread) {
                    const hasUnreadPosts = posts.some(p => p.feed_id === feedId && !p.is_read);
                    if (!hasUnreadPosts) {
                        feedStore.updateFeedHasUnread(feedId, false);
                    }
                }
            } else {
                if (!currentHasUnread) {
                    feedStore.updateFeedHasUnread(feedId, true);
                }
            }
        });
    };

    const readAllPosts = (feed_id?: number) => {
        window.electron.ipcRenderer.invoke('db-read-all-posts', feed_id);
        const posts = get().posts.map(p => ({ ...p, is_read: true }));
        set({ posts });

        if (feed_id) {
            useFeedStore.getState().updateFeedHasUnread(feed_id, false);
        } else {
            const affectedFeedIds = new Set(posts.map(p => p.feed_id));
            affectedFeedIds.forEach(id => {
                useFeedStore.getState().updateFeedHasUnread(id, false);
            });
        }
    };

    return {
        posts: [],
        currentPostId: null,
        setCurrentPost: post_id => {
            if (!post_id) return set({ currentPostId: null });

            const post = get().posts.find(p => p.id === post_id);
            if (!post) return;

            set({ currentPostId: post_id });

            if (!post.is_read) {
                updatePostReadById(Number(post_id), true);
            }
        },
        getCurrentPost,
        refreshPosts: (feed_id?: number, onlyUnread?: boolean) => {
            if (feed_id) {
                window.electron.ipcRenderer.invoke('db-get-posts-by-id', feed_id, onlyUnread).then(posts => {
                    set({ posts: posts || [] });
                });
            } else {
                window.electron.ipcRenderer.invoke('db-get-posts', onlyUnread).then(posts => set({ posts: posts || [] }));
            }
        },
        readAllPosts,
        updatePostReadById,
    };
});
