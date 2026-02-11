import type { IpcEvents } from '@shared/types/ipc';
import type { IpcMainInvokeEvent } from 'electron';
import { ipcMain as ipcMainOriginal } from 'electron';

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

export const ipcMain = {
    handle: <K extends keyof IpcEvents>(
        channel: K,
        listener: (event: IpcMainInvokeEvent, ...args: Parameters<IpcEvents[K]>) => ReturnType<IpcEvents[K]> | Promise<ReturnType<IpcEvents[K]>>,
    ) => {
        ipcMainOriginal.handle(channel, listener as any);
    },

    on: <K extends keyof IpcEvents>(channel: K, listener: (event: Electron.IpcMainEvent, ...args: Parameters<IpcEvents[K]>) => void) => {
        ipcMainOriginal.on(channel, listener as any);
    },

    removeHandler: (channel: keyof IpcEvents) => ipcMainOriginal.removeHandler(channel),
};
