import { create } from 'zustand';

import { useFeedStore } from './feeds';
import { useFolderStore } from './folders';

export type PostType = {
    id: number;
    title: string;
    link: string;
    author: string;
    image_url: string;
    summary: string;
    podcast: string;
    is_read: boolean;
    pub_date: string;
    feed_id: number;
};

interface UsePostStore {
    posts: PostType[];
    selectedPostId: number | null;

    offset: number;
    hasMore: boolean;
    isLoading: boolean;

    setSelectedPost: (post_id: number | null) => void;
    getSelectedPost: () => PostType | null;

    refreshPosts: () => void;
    loadMorePosts: () => void;

    readAllPosts: (feed_id?: number) => void;
    updatePostReadById: (post_id: number, is_read: boolean) => void;

    onlyUnread: boolean;
    setOnlyUnread: (only_unread: boolean) => void;
}

export const usePostStore = create<UsePostStore>((set, get) => {
    const setSelectedPost = (post_id: number | null) => {
        if (!post_id) return set({ selectedPostId: null });

        const post = get().posts.find(p => p.id === post_id)!;
        set({ selectedPostId: post_id });

        if (!post.is_read) {
            updatePostReadById(post_id, true);
        }
    };

    const getSelectedPost = () => {
        if (!get().selectedPostId) return null;
        return get().posts.find(post => post.id === get().selectedPostId) || null;
    };

    const updatePostReadById = (post_id: number, is_read: boolean = true) => {
        window.electron.ipcRenderer.invoke('db-update-post-read-by-id', post_id, is_read).then(() => {
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
        window.electron.ipcRenderer.invoke('db-read-all-posts', feed_id).then(() => {
            const posts = get().posts.map(p => ({ ...p, is_read: true }));
            set({ posts });

            if (feed_id) {
                useFeedStore.getState().updateFeedHasUnread(feed_id, false);
            } else {
                posts.forEach(p => useFeedStore.getState().updateFeedHasUnread(p.feed_id, false));
            }
        });
    };

    const loadPosts = async (offset: number, append: boolean = false) => {
        const selectedFeedId = useFeedStore.getState().selectedFeedId;
        const selectedFolderId = useFolderStore.getState().selectedFolderId;
        const limit = 50;

        set({ isLoading: true });

        try {
            let newPosts: PostType[];
            if (selectedFeedId) {
                newPosts = (await window.electron.ipcRenderer.invoke('db-get-posts-by-id', selectedFeedId, get().onlyUnread, offset, limit)) || [];
            } else if (selectedFolderId) {
                newPosts = (await window.electron.ipcRenderer.invoke('db-get-posts-by-folder-id', selectedFolderId, get().onlyUnread, offset, limit)) || [];
            } else {
                newPosts = (await window.electron.ipcRenderer.invoke('db-get-posts', get().onlyUnread, offset, limit)) || [];
            }

            const hasMore = newPosts.length === limit;

            if (append) {
                set(state => ({
                    posts: [...state.posts, ...newPosts],
                    offset: offset + newPosts.length,
                    hasMore,
                    isLoading: false,
                }));
            } else {
                set({
                    posts: newPosts,
                    offset: newPosts.length,
                    hasMore,
                    isLoading: false,
                });
            }
        } catch (error) {
            console.error('Failed to load posts:', error);
            set({ isLoading: false });
        }
    };

    const refreshPosts = () => {
        loadPosts(0, false);
    };

    const loadMorePosts = () => {
        const { offset, hasMore, isLoading } = get();
        if (!hasMore || isLoading) return;
        loadPosts(offset, true);
    };

    return {
        posts: [],
        selectedPostId: null,
        offset: 0,
        hasMore: true,
        isLoading: false,
        setSelectedPost,
        getSelectedPost,
        refreshPosts,
        loadMorePosts,
        readAllPosts,
        updatePostReadById,

        onlyUnread: false,
        setOnlyUnread: has_unread => set({ onlyUnread: has_unread }),
    };
});
