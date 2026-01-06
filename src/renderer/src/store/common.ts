import { create } from 'zustand';

export const useDragging = create<{ isDragging: boolean; setIsDragging: (isDragging: boolean) => void }>(set => {
    return {
        isDragging: false,
        setIsDragging: (isDragging: boolean) => set({ isDragging }),
    };
});

export const useView = create<{ view: number; setView: (view: number) => void }>(set => {
    return {
        view: 1,
        setView: (view: number) => set({ view }),
    };
});
