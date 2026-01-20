import { useEffect, useMemo, useRef, useState } from 'react';

type UseAudioOptions = {
    duration?: number;
    volume?: number;
};

export default function useAudio(url: string, options: UseAudioOptions) {
    const initialAudio = useMemo(() => {
        const audio = new Audio(url);
        audio.preload = 'none';
        return audio;
    }, [url]);
    const audioRef = useRef<HTMLAudioElement>(initialAudio);

    const { duration: initialDuration = 0, volume: initialVolume = 0.2 } = options;

    const SEEK_STEP = 5;

    const [duration, setDuration] = useState(initialDuration || 0);
    const [currentTime, setCurrentTime] = useState(0);
    const [volume, setVolume] = useState(initialVolume);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);

    return audioRef;
}
