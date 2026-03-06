import { create } from 'zustand';

const AUDIO_STORAGE_KEY = 'audio-track';

const value = localStorage.getItem('audio-volume');
const VOLUME_DEFAULT = value ? Number(value) : 0.2;

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

type SavedAudioState = AudioTrack & {
    currentTime: number;
    rate: number;
};

function loadSavedTrack(): SavedAudioState | null {
    const raw = localStorage.getItem(AUDIO_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedAudioState;
    if (!parsed?.podcast?.url) return null;
    return parsed;
}

function saveTrackToStorage(state: SavedAudioState) {
    localStorage.setItem(AUDIO_STORAGE_KEY, JSON.stringify(state));
}

function clearTrackFromStorage() {
    localStorage.removeItem(AUDIO_STORAGE_KEY);
}

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

const SAVE_THROTTLE_MS = 5000;
let lastSaveTime = 0;

export const useAudioStore = create<AudioState>((set, get) => {
    const audio = new Audio();
    audio.preload = 'none';
    audio.volume = VOLUME_DEFAULT;

    audio.addEventListener('durationchange', () => {
        set({ duration: audio.duration });
    });

    audio.addEventListener('timeupdate', () => {
        const now = audio.currentTime;
        set({ currentTime: now });
        // 节流保存播放进度
        const t = Date.now();
        if (t - lastSaveTime >= SAVE_THROTTLE_MS) {
            lastSaveTime = t;
            const s = get();
            if (s.podcast?.url) {
                saveTrackToStorage({
                    feedId: s.feedId,
                    postId: s.postId,
                    podcast: s.podcast,
                    currentTime: now,
                    rate: s.rate,
                });
            }
        }
    });

    audio.addEventListener('volumechange', () => {
        set({ volume: audio.volume });
        localStorage.setItem('audio-volume', audio.volume.toString());
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
            const saved = loadSavedTrack();
            const resumeTime = saved?.podcast?.url === url && saved.feedId === (feedId ?? null) && saved.postId === (postId ?? null) ? saved.currentTime : 0;

            if (audio.src !== url) {
                audio.src = url;
                audio.currentTime = resumeTime;
            } else if (resumeTime > 0) {
                audio.currentTime = resumeTime;
            }

            const rate = saved?.rate ?? 1;
            audio.playbackRate = rate;

            set({
                feedId: feedId ?? null,
                postId: postId ?? null,
                podcast: podcast ?? null,
                currentTime: resumeTime,
                duration: podcast.duration ?? get().duration,
                rate,
            });

            saveTrackToStorage({
                feedId: feedId ?? null,
                postId: postId ?? null,
                podcast: podcast ?? null,
                currentTime: resumeTime,
                rate,
            });
        },

        clearTrack: () => {
            set({ feedId: null, postId: null, podcast: { url: '' } });
            audio.src = '';
            clearTrackFromStorage();
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

// 应用关闭前保存当前播放状态
if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
        const s = useAudioStore.getState();
        if (s.podcast?.url) {
            saveTrackToStorage({
                feedId: s.feedId,
                postId: s.postId,
                podcast: s.podcast,
                currentTime: s.audio.currentTime,
                rate: s.rate,
            });
        }
    });
}

// 应用启动时恢复上次播放的音频
if (typeof window !== 'undefined') {
    const saved = loadSavedTrack();
    if (saved) {
        // 延迟执行，确保 store 已完全初始化
        setTimeout(() => {
            useAudioStore.getState().setTrack(saved);
        }, 0);
    }
}
