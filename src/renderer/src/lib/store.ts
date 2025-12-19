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
