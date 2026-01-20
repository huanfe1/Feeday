import { create } from 'zustand';

const VOLUME_DEFAULT = 0.2;

interface AudioTrack {
    url: string;
    title?: string;
    duration?: number;
    feedId?: number;
    postId?: number;
}

interface AudioState {
    audio: HTMLAudioElement;

    // 当前音频信息
    src: string | null;
    title?: string;
    feedId?: number | null;
    postId?: number | null;

    // 播放状态
    duration: number;
    currentTime: number;
    volume: number;
    isPlaying: boolean;
    isMuted: boolean;

    // actions
    setTrack: (track: AudioTrack) => void;
    play: () => Promise<void>;
    pause: () => void;
    togglePlayPause: () => void;
    seekBy: (delta: number) => void;
    setCurrentTime: (time: number) => void;
    setVolume: (volume: number) => void;
    toggleMute: () => void;
}

export const useAudioStore = create<AudioState>((set, get) => {
    const audio = new Audio();
    audio.preload = 'none';
    audio.volume = VOLUME_DEFAULT;

    audio.addEventListener('durationchange', () => {
        set({ duration: audio.duration || 0 });
    });

    audio.addEventListener('timeupdate', () => {
        set({ currentTime: audio.currentTime || 0 });
    });

    audio.addEventListener('volumechange', () => {
        set({
            volume: audio.volume,
            isMuted: audio.muted || audio.volume === 0,
        });
    });

    audio.addEventListener('play', () => {
        set({ isPlaying: true });
    });

    audio.addEventListener('pause', () => {
        set({ isPlaying: false });
    });

    audio.addEventListener('ended', () => {
        set({ isPlaying: false });
    });

    // 拖动/跳转进度完成后，同步当前时间并根据实际状态更新 isPlaying
    audio.addEventListener('seeked', () => {
        set({
            currentTime: audio.currentTime || 0,
            isPlaying: !audio.paused,
        });
    });

    const clampTime = (time: number) => {
        const duration = get().duration || audio.duration || 0;
        if (!duration || !isFinite(duration)) {
            return Math.max(0, time);
        }
        return Math.min(Math.max(0, time), duration);
    };

    return {
        audio,

        src: null,
        title: undefined,
        feedId: null,
        postId: null,

        duration: 0,
        currentTime: 0,
        volume: VOLUME_DEFAULT,
        isPlaying: false,
        isMuted: false,

        setTrack: ({ url, title, duration, feedId, postId }: AudioTrack) => {
            const { audio } = get();

            // 如果是新的音频地址，更新 src 并从头开始
            if (audio.src !== url) {
                audio.src = url;
                audio.currentTime = 0;
            }

            set({
                src: url,
                title,
                feedId: feedId ?? null,
                postId: postId ?? null,
                // 如果后端有提供 duration，优先用提供的；否则等待 durationchange 事件更新
                duration: duration ?? get().duration,
                currentTime: 0,
            });
        },

        play: async () => {
            const { audio } = get();
            try {
                await audio.play();
            } catch (e) {
                console.error('Audio play failed:', e);
            }
        },

        pause: () => {
            const { audio } = get();
            audio.pause();
        },

        togglePlayPause: () => {
            const { audio } = get();
            if (audio.paused) {
                get().play();
            } else {
                audio.pause();
            }
        },

        seekBy: (delta: number) => {
            const { audio } = get();
            const newTime = clampTime((audio.currentTime || 0) + delta);
            audio.currentTime = newTime;
            set({ currentTime: newTime });
        },

        setCurrentTime: (time: number) => {
            const { audio } = get();
            const newTime = clampTime(time);
            audio.currentTime = newTime;
            set({ currentTime: newTime });
        },

        setVolume: (volume: number) => {
            const { audio } = get();
            const v = Math.min(Math.max(volume, 0), 1);
            audio.volume = v;
            if (v > 0 && audio.muted) {
                audio.muted = false;
            }
            set({
                volume: v,
                isMuted: audio.muted || v === 0,
            });
        },

        toggleMute: () => {
            const { audio } = get();
            audio.muted = !audio.muted;
            set({ isMuted: audio.muted });
        },
    };
});
