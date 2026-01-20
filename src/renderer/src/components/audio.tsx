import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface AudioPlayerProps {
    url: string;
    title?: string;
    duration?: number;
    className?: string;
}

export function AudioPlayer({ url, duration: initialDuration, title, className }: AudioPlayerProps) {
    const audioRef = useRef<HTMLAudioElement>(null);

    const VOLUME_DEFAULT = 0.2;
    const SEEK_STEP = 5;

    const [duration, setDuration] = useState(initialDuration || 0);
    const [currentTime, setCurrentTime] = useState(0);
    const [volume, setVolume] = useState(VOLUME_DEFAULT);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);

    const [_currentTime, set_CurrentTime] = useState<number | null>(null);

    const togglePlayPause = () => {
        if (isPlaying) {
            audioRef.current?.pause();
        } else {
            audioRef.current?.play();
        }
    };

    const seekBackward = () => {
        if (!audioRef.current) return;
        const newTime = Math.max(0, audioRef.current.currentTime - SEEK_STEP);
        audioRef.current.currentTime = newTime;
        setCurrentTime(newTime);
    };

    const seekForward = () => {
        if (!audioRef.current) return;
        const newTime = Math.min(duration, audioRef.current.currentTime + SEEK_STEP);
        audioRef.current.currentTime = newTime;
        setCurrentTime(newTime);
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
        // const newVolume = values[0];
        // audioRef.current.volume = newVolume;
        // setVolume(newVolume);
        // if (newVolume > 0 && isMuted) {
        //     audioRef.current.muted = false;
        //     setIsMuted(false);
        // }
    };

    const toggleMuteHandler = () => {
        if (!audioRef.current) return;
        audioRef.current.muted = !isMuted;
        setIsMuted(!isMuted);
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
            <audio className="hidden" ref={audioRef} preload="metadata" src={url}></audio>

            {title && (
                <div className="mb-3">
                    <h3 className="text-foreground line-clamp-1 text-sm font-medium">{title}</h3>
                </div>
            )}

            <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button className="h-9 w-9" variant="ghost" size="icon" onClick={seekBackward}>
                                <i className="i-mingcute-rewind-backward-5-line text-lg" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>后退 {SEEK_STEP} 秒</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button className="h-10 w-10 rounded-full" variant="default" size="icon" onClick={togglePlayPause}>
                                <i className={cn('text-xl', isPlaying ? 'i-mingcute-pause-fill' : 'i-mingcute-play-fill')} />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>{isPlaying ? '暂停' : '播放'}</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button className="h-9 w-9" variant="ghost" size="icon" onClick={seekForward}>
                                <i className="i-mingcute-rewind-forward-5-line text-lg" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>前进 {SEEK_STEP} 秒</TooltipContent>
                    </Tooltip>
                </div>

                {duration > 0 && (
                    <div className="flex flex-1 items-center gap-3">
                        <span className="text-muted-foreground min-w-[70px] text-right text-xs font-medium tabular-nums select-none">
                            {formatTime(_currentTime ?? currentTime)} / {formatTime(duration)}
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
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button className="h-9 w-9" variant="ghost" size="icon" onClick={toggleMuteHandler}>
                                <i className={cn('text-lg', volume === 0 || isMuted ? 'i-mingcute-volume-mute-line' : 'i-mingcute-volume-fill')} />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent theme="light">
                            <Slider orientation="vertical" onValueChange={volumeChangeHandler} value={[isMuted ? 0 : volume]} min={0} max={1} step={0.01} />
                        </TooltipContent>
                    </Tooltip>
                </div>
            </div>
        </div>
    );
}
