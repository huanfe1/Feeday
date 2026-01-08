import { create } from 'zustand';

import { useFeedStore } from './feeds';

type Post = {
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
    posts: Post[];
    currentPost: Post | null;
    setCurrentPost: (post_id: number | null) => void;
    refreshPosts: (feed_id?: number, onlyUnread?: boolean) => void;
    readAllPosts: (feed_id?: number) => void;
    updatePostReadById: (post_id: number, is_read: boolean) => void;
}

export const usePostStore = create<UsePostStore>((set, get) => {
    const updatePostReadById = (post_id: number, is_read: boolean = true) => {
        window.electron.ipcRenderer.invoke('db-update-post-read-by-id', Number(post_id), is_read);
        const posts = get().posts.map(p => (p.id === post_id ? { ...p, is_read } : p));
        const currentPost = get().currentPost;
        set({
            posts,
            currentPost: currentPost && currentPost.id === post_id ? { ...currentPost, is_read } : currentPost,
        });
    };

    const readAllPosts = (feed_id?: number) => {
        window.electron.ipcRenderer.invoke('db-read-all-posts', feed_id);
        const posts = get().posts.map(p => ({ ...p, is_read: true }));
        const currentPost = get().currentPost;
        set({
            posts,
            currentPost: currentPost ? { ...currentPost, is_read: true } : currentPost,
        });
    };

    return {
        posts: [],
        currentPost: null,
        setCurrentPost: post_id => {
            if (!post_id) return set({ currentPost: null });

            const post = get().posts.find(p => p.id === post_id);
            if (!post) return;

            // Create a new object to ensure reactivity
            set({ currentPost: { ...post } });

            if (post.is_read) return;
            updatePostReadById(Number(post_id), true);
            if (!get().posts.some(p => p.feed_id === post.feed_id && !p.is_read)) {
                useFeedStore.getState().feeds.find(f => f.id === post.feed_id)!.has_unread = false;
            }
        },
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
