import type { ElectronAPI } from '@electron-toolkit/preload';
import type { IpcEvents } from '@shared/types/ipc';

declare global {
    interface Window {
        electron: Omit<ElectronAPI, 'ipcRenderer'> & {
            ipcRenderer: {
                invoke<K extends keyof IpcEvents>(channel: K, ...args: Parameters<IpcEvents[K]>): Promise<Awaited<ReturnType<IpcEvents[K]>>>;

                send<K extends keyof IpcEvents>(channel: K, ...args: Parameters<IpcEvents[K]>): void;

                on: (channel: string, listener: (...args: any[]) => void) => void;
            };
        };
        api: unknown;
    }
}
