import { type AudioTrack, useAudioStore } from '@/store';
import { memo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn, formatTime } from '@/lib/utils';

import { VolumeBar } from './volume';

type PostAudioProps = {
    className?: string;
    audio: AudioTrack;
};

export function PostAudio({ className, audio }: PostAudioProps) {
    const SEEK_STEP = 5;

    const src = useAudioStore(state => state?.podcast?.url);
    const playingFeedId = useAudioStore(state => state.feedId);
    const playingPostId = useAudioStore(state => state.postId);
    const isPlaying = useAudioStore(state => state.isPlaying);
    const setTrack = useAudioStore(state => state.setTrack);
    const togglePlayPause = useAudioStore(state => state.togglePlayPause);
    const play = useAudioStore(state => state.play);
    const seekBy = useAudioStore(state => state.seekBy);

    const isActive = src === audio?.podcast?.url && playingFeedId === audio?.feedId && playingPostId === audio?.postId;

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
            setTrack(audio);
            play();
        } else {
            togglePlayPause();
        }
    };

    return (
        <div className={cn('bg-card rounded-lg border p-4', className)}>
            {audio.podcast.title && (
                <div className="mb-3">
                    <h3 className="text-foreground line-clamp-1 text-sm font-medium">{audio.podcast.title}</h3>
                </div>
            )}

            <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button className="h-9 w-9" onClick={seekBackward} size="icon" variant="ghost">
                                <i className="i-mingcute-rewind-backward-5-line text-lg" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>后退 {SEEK_STEP} 秒</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button className="h-10 w-10 rounded-full" onClick={playButtonHandler} size="icon" variant="default">
                                <i className={cn('text-xl', isActive && isPlaying ? 'i-mingcute-pause-fill' : 'i-mingcute-play-fill')} />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>{isActive && isPlaying ? '暂停' : '播放'}</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button className="h-9 w-9" onClick={seekForward} size="icon" variant="ghost">
                                <i className="i-mingcute-rewind-forward-5-line text-lg" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>前进 {SEEK_STEP} 秒</TooltipContent>
                    </Tooltip>
                </div>
                <ProgressBar duration={audio.podcast.duration} isActive={isActive} />
                <VolumeBar />
            </div>
        </div>
    );
}

const ProgressBar = memo(function ProgressBar({ isActive, duration: initialDuration }: { isActive: boolean; duration?: number }) {
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
                {formatTime(displayTime)} / {formatTime(displayDuration ?? 0)}
            </span>
            <Slider
                className="w-full"
                max={displayDuration}
                min={0}
                onValueChange={currentTimeChangeHandler}
                onValueCommit={currentTimeCommitHandler}
                step={1}
                value={[displayTime]}
            />
        </div>
    );
});
