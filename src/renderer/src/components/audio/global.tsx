import { useAudioStore } from '@/store';
import { memo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn, formatTime } from '@/lib/utils';

import { VolumeBar } from './volume';

export function GlobalAudio() {
    const feedId = useAudioStore(state => state.feedId);
    const isPlaying = useAudioStore(state => state.isPlaying);

    const togglePlayPause = useAudioStore(state => state.togglePlayPause);

    const podcast = useAudioStore(state => state.podcast);
    const clearTrack = useAudioStore(state => state.clearTrack);

    if (!podcast.url) return null;

    const handleJumpToPost = () => {
        document.dispatchEvent(new CustomEvent('jump-to-feed', { detail: feedId }));
    };

    const handleClose = () => clearTrack();

    const handleDownload = () => {
        window.open(podcast.url, '_blank');
    };

    return (
        <div className="shrink-0 bg-white shadow-2xl">
            <div className="flex items-center justify-between px-1.5">
                <div className="flex items-center gap-1">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button className="h-7 w-7" variant="ghost" size="icon" onClick={handleClose}>
                                <i className="i-mingcute-close-line text-sm" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>关闭</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button className="h-7 w-7" variant="ghost" size="icon" onClick={handleJumpToPost}>
                                <i className="i-mingcute-external-link-line text-sm" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>跳转到对应文章</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button className="h-7 w-7" variant="ghost" size="icon" onClick={handleDownload}>
                                <i className="i-mingcute-download-line text-sm" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>下载</TooltipContent>
                    </Tooltip>
                </div>

                <div className="flex items-center gap-1">
                    <RateButton />
                    <VolumeBar />
                </div>
            </div>

            <div className="group flex items-center gap-3 p-2">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg">
                    <div
                        className="bg-border flex h-full w-full items-center justify-center bg-cover bg-center bg-no-repeat"
                        style={{
                            backgroundImage: `url(${podcast.image})`,
                        }}
                        onClick={togglePlayPause}
                    >
                        <span className="flex items-center rounded-full bg-white p-2 opacity-0 transition-opacity group-hover:opacity-100">
                            <i className={cn('text-2xl', isPlaying ? 'i-mingcute-pause-fill' : 'i-mingcute-play-fill')} />
                        </span>
                    </div>
                </div>

                <div className="min-w-0 flex-1">
                    {podcast.title && <div className="text-foreground mb-1 line-clamp-1 text-sm font-medium">{podcast.title}</div>}
                    <ProgressBar />
                </div>
            </div>
        </div>
    );
}

const ProgressBar = memo(function ProgressBar() {
    const currentTime = useAudioStore(state => Math.floor(state.currentTime));
    const duration = useAudioStore(state => state.duration);
    const setCurrentTime = useAudioStore(state => state.setCurrentTime);

    const [_currentTime, set_CurrentTime] = useState<number | null>(null);

    const currentTimeChangeHandler = (values: number[]) => {
        set_CurrentTime(values[0]);
    };
    const currentTimeCommitHandler = (values: number[]) => {
        setCurrentTime(values[0]);
        set_CurrentTime(null);
    };

    const displayTime = _currentTime ?? currentTime;

    return (
        <div className="flex flex-1 flex-col items-center gap-3">
            <div className="flex w-full items-center justify-between">
                <span className="text-muted-foreground min-w-[70px] shrink-0 text-right text-xs font-medium tabular-nums select-none">
                    {formatTime(displayTime)} / {formatTime(duration)}
                </span>
            </div>
            <Slider className="w-full" value={[displayTime]} onValueCommit={currentTimeCommitHandler} onValueChange={currentTimeChangeHandler} min={0} max={duration} step={0.1} />
        </div>
    );
});

const RateButton = memo(function RateButton() {
    const rate = useAudioStore(state => state.rate);
    const setRate = useAudioStore(state => state.setRate);

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button className="h-7 w-12" variant="ghost">
                    <span className="text-xs font-medium">{rate}x</span>
                </Button>
            </TooltipTrigger>
            <TooltipContent className="p-1" theme="light">
                <div className="flex flex-col gap-y-1">
                    {[0.5, 0.75, 1, 1.25, 1.5, 2.0].map(r => (
                        <div
                            className={cn('flex h-8 w-14 cursor-default items-center justify-center rounded duration-200', r === rate ? 'bg-primary text-primary-foreground' : '')}
                            key={r}
                            onClick={() => setRate(r)}
                        >
                            <span className="text-xs font-medium">{r}x</span>
                        </div>
                    ))}
                </div>
            </TooltipContent>
        </Tooltip>
    );
});
