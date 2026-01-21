import { type AudioTrack, useAudioStore } from '@/store';
import { memo, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn, formatTime } from '@/lib/utils';

type AudioPlayerProps = AudioTrack & {
    className?: string;
};

export function AudioPlayer({ className, postId, feedId, podcast }: AudioPlayerProps) {
    const SEEK_STEP = 5;

    const src = useAudioStore(state => state?.podcast?.url);
    const playingFeedId = useAudioStore(state => state.feedId);
    const playingPostId = useAudioStore(state => state.postId);
    const isPlaying = useAudioStore(state => state.isPlaying);
    const setTrack = useAudioStore(state => state.setTrack);
    const togglePlayPause = useAudioStore(state => state.togglePlayPause);
    const play = useAudioStore(state => state.play);
    const seekBy = useAudioStore(state => state.seekBy);

    const isActive = src === podcast.url && playingFeedId === feedId && playingPostId === postId;

    const seekBackward = () => {
        if (!isActive) return;
        seekBy(-SEEK_STEP);
    };

    const seekForward = () => {
        if (!isActive) return;
        seekBy(SEEK_STEP);
    };

    const playButtonHandler = () => {
        if (!isActive) {
            setTrack({ feedId, postId, podcast });
            play();
        } else {
            togglePlayPause();
        }
    };

    return (
        <div className={cn('bg-card rounded-lg border p-4', className)}>
            {podcast.title && (
                <div className="mb-3">
                    <h3 className="text-foreground line-clamp-1 text-sm font-medium">{podcast.title}</h3>
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
                            <Button className="h-10 w-10 rounded-full" variant="default" size="icon" onClick={playButtonHandler}>
                                <i className={cn('text-xl', isActive && isPlaying ? 'i-mingcute-pause-fill' : 'i-mingcute-play-fill')} />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>{isActive && isPlaying ? '暂停' : '播放'}</TooltipContent>
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
                <ProgressBar isActive={isActive} duration={podcast.duration ?? 0} />
                <VolumeBar />
            </div>
        </div>
    );
}

const ProgressBar = memo(function ProgressBar({ isActive, duration: initialDuration }: { isActive: boolean; duration: number }) {
    const currentTime = useAudioStore(state => Math.trunc(state.currentTime));
    const duration = useAudioStore(state => state.duration);
    const setCurrentTime = useAudioStore(state => state.setCurrentTime);

    const [_currentTime, set_CurrentTime] = useState<number | null>(null);

    const currentTimeChangeHandler = (values: number[]) => {
        if (!isActive) return;
        set_CurrentTime(values[0]);
    };
    const currentTimeCommitHandler = (values: number[]) => {
        if (!isActive) return;
        setCurrentTime(values[0]);
        set_CurrentTime(null);
    };

    const displayTime = isActive ? (_currentTime ?? currentTime) : 0;
    const displayDuration = isActive ? duration : initialDuration;

    return (
        <div className="flex flex-1 items-center gap-3">
            <span className="text-muted-foreground min-w-[70px] shrink-0 text-right text-xs font-medium tabular-nums select-none">
                {formatTime(displayTime)} / {formatTime(displayDuration)}
            </span>
            <Slider className="w-full" value={[displayTime]} onValueCommit={currentTimeCommitHandler} onValueChange={currentTimeChangeHandler} min={0} max={duration} step={0.1} />
        </div>
    );
});

const VolumeBar = memo(function VolumeBar() {
    const volume = useAudioStore(state => state.volume);
    const isMuted = useAudioStore(state => state.isMuted);
    const setVolume = useAudioStore(state => state.setVolume);
    const toggleMute = useAudioStore(state => state.toggleMute);

    const [tooltipOpen, setTooltipOpen] = useState(false);
    const isDraggingRef = useRef(false);
    const [localVolume, setLocalVolume] = useState<number | null>(null);

    const displayVolume = localVolume ?? (isMuted ? 0 : volume);

    const volumeChangeHandler = (values: number[]) => {
        const newVolume = values[0];
        setLocalVolume(newVolume);
        if (isMuted && newVolume > 0) toggleMute();
        setVolume(newVolume);
    };

    const handleOpenChange = (open: boolean) => {
        if (isDraggingRef.current && !open) return;
        setTooltipOpen(open);
        if (!open) setLocalVolume(null);
    };

    const handleDrag = (isDown: boolean) => {
        isDraggingRef.current = isDown;
        if (isDown) setTooltipOpen(true);
        else setLocalVolume(null);
    };

    return (
        <div className="flex shrink-0 items-center gap-2">
            <Tooltip open={tooltipOpen} onOpenChange={handleOpenChange}>
                <TooltipTrigger asChild>
                    <Button className="h-9 w-9" variant="ghost" size="icon" onClick={toggleMute}>
                        <i className={cn('text-sm', volume === 0 || isMuted ? 'i-mingcute-volume-mute-line' : 'i-mingcute-volume-fill')} />
                    </Button>
                </TooltipTrigger>
                <TooltipContent theme="light" onPointerDown={() => handleDrag(true)} onPointerUp={() => handleDrag(false)}>
                    <Slider
                        orientation="vertical"
                        onValueChange={volumeChangeHandler}
                        value={[displayVolume]}
                        min={0}
                        max={1}
                        step={0.01}
                        onPointerDown={() => handleDrag(true)}
                        onPointerUp={() => handleDrag(false)}
                    />
                </TooltipContent>
            </Tooltip>
        </div>
    );
});
