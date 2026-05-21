import type { FeedKey, FeedKeyPrefix } from '@shared/types';
import { create } from 'zustand';

import { useAudioStore } from './audio';
import { useDragging, useView } from './common';
import { useFolderStore } from './folders';

export type { FolderType } from './folders';
export type { AudioTrack } from './audio';

export { useDragging, useFolderStore, useView, useAudioStore };

interface UseStore {
    view: number;
    setView: (view: number) => void;

    feedKey: FeedKey;
    setFeedKey: (feedKey: FeedKey) => void;
    getFeedKey: () => [FeedKeyPrefix, number];

    postId: number | null;
    setPostId: (postId: number | null) => void;
}

export const useStore = create<UseStore>((set, get) => {
    return {
        view: 1,
        setView: (view: number) => set({ view }),

        feedKey: 'view-1',
        setFeedKey: (feedKey: FeedKey) => set({ feedKey }),
        getFeedKey: () => get().feedKey.split('-') as [FeedKeyPrefix, number],

        postId: null,
        setPostId: (postId: number | null) => set({ postId }),
    };
});
