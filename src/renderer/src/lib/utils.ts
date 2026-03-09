import { type ClassValue, clsx } from 'clsx';
import type { Variants } from 'motion/react';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
    return twMerge(clsx(inputs));
}

export const enterVariants: Variants = {
    initial: {
        opacity: 0,
        y: 30,
    },
    animate: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.2, ease: 'easeIn' },
    },
    exit: {
        opacity: 0,
        y: -20,
        transition: { duration: 0.2, ease: 'easeIn' },
    },
};
