import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

interface AudioPlayerProps {
    url: string;
    title?: string;
    duration?: number;
    className?: string;
}

export function AudioPlayer({ url, duration: initialDuration, className }: AudioPlayerProps) {
    const audioRef = useRef<HTMLAudioElement>(null);

    const VOLUME_DEFAULT = 0.2;

    const [duration, setDuration] = useState(initialDuration || 0);
    const [currentTime, setCurrentTime] = useState(0);
    const [volume, setVolume] = useState(VOLUME_DEFAULT);
    const [isPlaying, setIsPlaying] = useState(false);

    const [_currentTime, set_CurrentTime] = useState<number | null>(null);

    const togglePlayPause = () => {
        if (isPlaying) {
            audioRef.current?.pause();
        } else {
            audioRef.current?.play();
        }
    };

    const currentTimeChangeHandler = (values: number[]) => {
        if (!audioRef.current) return;
        set_CurrentTime(values[0]);
        setIsPlaying(false);
    };
    const currentTimeCommitHandler = (values: number[]) => {
        if (!audioRef.current) return;
        audioRef.current.currentTime = values[0];
        setCurrentTime(values[0]);
        set_CurrentTime(null);
    };
    const volumeChangeHandler = (values: number[]) => {
        if (!audioRef.current) return;
        audioRef.current.volume = values[0];
        setVolume(values[0]);
    };

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        audio.volume = VOLUME_DEFAULT;

        const durationchangeHandler = () => setDuration(audio.duration);
        const timeupdateHandler = () => setCurrentTime(audio.currentTime);
        const volumechangeHandler = () => setVolume(audio.volume);
        const playHandler = () => setIsPlaying(true);
        const pauseHandler = () => setIsPlaying(false);
        const seekedHandler = () => setIsPlaying(true);

        audio.addEventListener('durationchange', durationchangeHandler);
        audio.addEventListener('timeupdate', timeupdateHandler);
        audio.addEventListener('volumechange', volumechangeHandler);
        audio.addEventListener('play', playHandler);
        audio.addEventListener('pause', pauseHandler);
        audio.addEventListener('seeked', seekedHandler);
        return () => {
            audio.removeEventListener('durationchange', durationchangeHandler);
            audio.removeEventListener('timeupdate', timeupdateHandler);
            audio.removeEventListener('volumechange', volumechangeHandler);
            audio.removeEventListener('play', playHandler);
            audio.removeEventListener('pause', pauseHandler);
            audio.removeEventListener('seeked', seekedHandler);
        };
    }, []);

    const formatTime = (seconds: number): string => {
        if (isNaN(seconds) || !isFinite(seconds)) return '00:00';
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        if (hrs > 0) {
            return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        if (mins > 0) {
            return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `00:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className={cn('bg-card rounded-lg border p-4', className)}>
            <audio className="hidden" ref={audioRef} preload="none" controls src={url}></audio>

            <div className="flex items-center gap-3">
                <Button className="h-10 w-10 shrink-0" variant="ghost" onClick={togglePlayPause} size="icon">
                    {isPlaying ? <i className="i-mingcute-pause-fill text-xl"></i> : <i className="i-mingcute-play-fill text-xl"></i>}
                </Button>

                {/* 进度条和时间 */}
                {duration > 0 && (
                    <div className="flex flex-1 items-center gap-3">
                        <span className="text-muted-foreground min-w-[45px] text-xs font-medium tabular-nums select-none">
                            {formatTime(currentTime)} / {formatTime(duration)}
                        </span>
                        <div className="flex-1">
                            <Slider
                                className="w-full"
                                value={[_currentTime ?? currentTime]}
                                onValueCommit={currentTimeCommitHandler}
                                onValueChange={currentTimeChangeHandler}
                                min={0}
                                max={duration}
                                step={0.1}
                            />
                        </div>
                    </div>
                )}

                <div className="flex shrink-0 items-center gap-2">
                    <i className={cn('text-lg', volume === 0 ? 'i-mingcute-volume-mute-line' : 'i-mingcute-volume-fill')}></i>
                    <div className="w-24">
                        <Slider onValueChange={volumeChangeHandler} value={[volume]} min={0} max={1} step={0.01} />
                    </div>
                </div>
            </div>
        </div>
    );
}
