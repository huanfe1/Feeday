import { create } from 'zustand';

type Feed = {
    id: number;
    title: string;
    link: string;
};
export const useFeed = create<{ feed: Feed; setFeed: (feed: Feed) => void; cancelFeed: () => void }>(set => ({
    feed: {} as any,
    setFeed: (feed: any) => set({ feed }),
    cancelFeed: () => set({ feed: {} as any }),
}));

type Post = {
    id: number;
    title: string;
    link: string;
    author: string;
    content: string;
    pub_date: string;
    summary: string;
};
export const usePost = create<{ post: Post; setPost: (post: Post) => void; cancelPost: () => void }>(set => ({
    post: {} as any,
    setPost: (post: any) => set({ post }),
    cancelPost: () => set({ post: {} as any }),
}));
