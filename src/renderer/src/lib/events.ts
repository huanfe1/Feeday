export interface EventMap {
    'jump-to-feed': { feedId: number; postId: number };
}

class EventEmitter<T extends EventMap> extends EventTarget {
    on<K extends keyof T>(type: K, listener: (detail: T[K]) => void, options?: AddEventListenerOptions): () => void {
        const wrapper = (event: Event) => {
            listener((event as CustomEvent).detail);
        };
        this.addEventListener(type as string, wrapper, options);
        return () => this.removeEventListener(type as string, wrapper);
    }

    emit<K extends keyof T>(type: K, detail: T[K]): void {
        const event = new CustomEvent(type as string, { detail });
        this.dispatchEvent(event);
    }

    once<K extends keyof T>(type: K, listener: (detail: T[K]) => void): void {
        this.on(type, listener, { once: true });
    }

    off<K extends keyof T>(type: K, listener: EventListenerOrEventListenerObject): void {
        this.removeEventListener(type as string, listener);
    }
}
export const eventBus = new EventEmitter<EventMap>();
