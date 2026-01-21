import { create } from 'zustand';

const VOLUME_DEFAULT = 0.2;

type PodcastType = {
    url: string;
    title?: string;
    duration?: number;
    image?: string;
};

export type AudioTrack = {
    feedId: number | null;
    postId: number | null;
    podcast: PodcastType;
};

type AudioState = AudioTrack & {
    audio: HTMLAudioElement;

    // 播放状态
    duration: number;
    currentTime: number;
    volume: number;
    isPlaying: boolean;
    isMuted: boolean;
    rate: number;
    setRate: (rate: number) => void;

    // actions
    setTrack: (track: AudioTrack) => void;
    clearTrack: () => void;
    play: () => void;
    pause: () => void;
    togglePlayPause: () => void;
    seekBy: (delta: number) => void;
    setCurrentTime: (time: number) => void;
    setVolume: (volume: number) => void;
    toggleMute: () => void;
};

export const useAudioStore = create<AudioState>((set, get) => {
    const audio = new Audio();
    audio.preload = 'none';
    audio.volume = VOLUME_DEFAULT;

    audio.addEventListener('durationchange', () => {
        set({ duration: audio.duration });
    });

    audio.addEventListener('timeupdate', () => {
        set({ currentTime: audio.currentTime });
    });

    audio.addEventListener('volumechange', () => {
        set({ volume: audio.volume });
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

    audio.addEventListener('ratechange', () => {
        set({ rate: audio.playbackRate });
    });

    // audio.addEventListener('seeking', () => {
    //     get().pause();
    // });

    // audio.addEventListener('seeked', () => {
    //     set({ currentTime: audio.currentTime });
    //     get().play();
    // });

    const clampTime = (time: number) => {
        const duration = get().duration || audio.duration || 0;
        if (!duration || !isFinite(duration)) {
            return Math.max(0, time);
        }
        return Math.min(Math.max(0, time), duration);
    };

    return {
        audio,

        feedId: null,
        postId: null,
        podcast: { url: '' },

        duration: 0,
        currentTime: 0,
        volume: VOLUME_DEFAULT,
        isPlaying: false,
        isMuted: false,
        rate: 1,

        setTrack: ({ feedId, postId, podcast }: AudioTrack) => {
            const { audio } = get();
            const url = podcast.url;

            if (audio.src !== url) {
                audio.src = url;
                audio.currentTime = 0;
            }

            set({
                feedId: feedId ?? null,
                postId: postId ?? null,
                podcast: podcast ?? null,
                currentTime: 0,
                duration: podcast.duration ?? get().duration,
            });
        },

        clearTrack: () => {
            set({ feedId: null, postId: null, podcast: { url: '' } });
            audio.src = '';
        },

        play: () => {
            get().audio.play();
        },

        pause: () => {
            get().audio.pause();
        },

        togglePlayPause: () => {
            if (get().audio.paused) {
                get().play();
            } else {
                get().audio.pause();
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
            const audio = get().audio;
            audio.volume = Math.min(Math.max(volume, 0), 1);
            audio.muted && get().toggleMute();
        },

        toggleMute: () => {
            const { audio } = get();
            audio.muted = !audio.muted;
            set({ isMuted: audio.muted });
        },

        setRate: (rate: number) => {
            get().audio.playbackRate = rate;
            set({ rate });
        },
    };
});
