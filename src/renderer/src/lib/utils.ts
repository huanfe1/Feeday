import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
    return twMerge(clsx(inputs));
}

export function truncate(str: string, length = 60) {
    if (typeof str !== 'string' || str.trim() === '') return;
    str = str
        .trimStart()
        .replace(/<[^>]+>/gi, '')
        .replace(/\s+/g, ' ')
        .trim()
        .split('\n')[0];
    const omission = '...';
    const omissionLength = omission.length;
    if (str.length <= length) return str;
    return str.slice(0, length - omissionLength) + omission;
}
