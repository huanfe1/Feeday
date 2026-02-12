import type { PostWithNormalized } from '@shared/types/database';
import { create } from 'zustand';

import { useView } from './common';
import { useFeedStore } from './feeds';
import { useFolderStore } from './folders';

export type PostType = PostWithNormalized;

interface UsePostStore {
    posts: PostType[];
    selectedPostId: number | null;

    setSelectedPost: (postId: number | null) => void;
    getSelectedPost: () => PostType | null;

    refreshPosts: () => void;
    readAllPosts: (feedId?: number, folderId?: number) => void;
    updatePostReadById: (postId: number, isRead: boolean) => void;

    onlyUnread: boolean;
    setOnlyUnread: (onlyUnread: boolean) => void;
}

export const usePostStore = create<UsePostStore>((set, get) => {
    const setSelectedPost = (postId: number | null) => {
        if (!postId) return set({ selectedPostId: null });

        const post = get().posts.find(p => p.id === postId)!;
        set({ selectedPostId: postId });

        if (!post?.isRead) {
            updatePostReadById(postId, true);
        }
    };

    const getSelectedPost = () => {
        if (!get().selectedPostId) return null;
        return get().posts.find(post => post.id === get().selectedPostId) || null;
    };

    const updatePostReadById = (postId: number, isRead: boolean = true) => {
        window.electron.ipcRenderer.invoke('db-update-post-read-by-id', postId, isRead).then(() => {
            const posts = get().posts.map(p => (p.id === postId ? { ...p, isRead } : p));
            set({ posts });

            const updatedPost = posts.find(p => p.id === postId);
            if (!updatedPost) return;

            const feedId = updatedPost.feedId;
            const feedStore = useFeedStore.getState();
            const feed = feedStore.feeds.find(f => f.id === feedId);
            if (!feed) return;

            const currentHasUnread = feed.hasUnread;

            if (isRead) {
                if (currentHasUnread) {
                    const hasUnreadPosts = posts.some(p => p.feedId === feedId && !p.isRead);
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

    const readAllPosts = (feedId?: number, folderId?: number) => {
        if (feedId && folderId) throw new Error('feedId and folderId cannot be provided at the same time');

        window.electron.ipcRenderer.invoke('db-read-all-posts', feedId, folderId).then(() => {
            const posts = get().posts.map(p => ({ ...p, isRead: true }));
            set({ posts });

            if (feedId) {
                useFeedStore.getState().updateFeedHasUnread(feedId, false);
                return;
            }

            if (folderId) {
                const feedStore = useFeedStore.getState();
                feedStore.feeds.filter(feed => feed.folderId === folderId).forEach(feed => feed.id != null && feedStore.updateFeedHasUnread(feed.id, false));
                return;
            }

            posts.forEach(p => useFeedStore.getState().updateFeedHasUnread(p.feedId, false));
        });
    };

    const refreshPosts = () => {
        const selectedFeedId = useFeedStore.getState().selectedFeedId;
        const selectedFolderId = useFolderStore.getState().selectedFolderId;
        const view = useView.getState().view;
        window.electron.ipcRenderer
            .invoke('db-get-posts', { onlyUnread: get().onlyUnread, feedId: selectedFeedId ?? undefined, folderId: selectedFolderId ?? undefined, view })
            .then(posts =>
                set({
                    posts: posts.map(
                        (p): PostWithNormalized => ({
                            ...p,
                            isRead: p.isRead === 1,
                            summary: p.summary ?? '',
                        }),
                    ),
                }),
            );
    };

    return {
        posts: [],
        selectedPostId: null,
        setSelectedPost,
        getSelectedPost,
        refreshPosts,
        readAllPosts,
        updatePostReadById,

        onlyUnread: false,
        setOnlyUnread: hasUnread => set({ onlyUnread: hasUnread }),
    };
});
