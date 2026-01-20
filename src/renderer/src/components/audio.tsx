import { useAudioStore } from '@/store';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface AudioPlayerProps {
    url: string;
    title?: string;
    duration?: number;
    className?: string;
    postId: number;
    feedId: number;
}

export function AudioPlayer({ url, duration: initialDuration, title, className, postId, feedId }: AudioPlayerProps) {
    const SEEK_STEP = 5;
    // 用全局 audio store 管理真实的 Audio 实例和状态
    // 注意：每个 selector 只返回一个原始值/函数，避免 React 对 getSnapshot 的无限循环警告
    const src = useAudioStore(state => state.src);
    const playingFeedId = useAudioStore(state => state.feedId);
    const playingPostId = useAudioStore(state => state.postId);
    const storeDuration = useAudioStore(state => state.duration);
    const currentTime = useAudioStore(state => state.currentTime);
    const volume = useAudioStore(state => state.volume);
    const isPlaying = useAudioStore(state => state.isPlaying);
    const isMuted = useAudioStore(state => state.isMuted);
    const setTrack = useAudioStore(state => state.setTrack);
    const togglePlayPause = useAudioStore(state => state.togglePlayPause);
    const play = useAudioStore(state => state.play);
    const pause = useAudioStore(state => state.pause);
    const seekBy = useAudioStore(state => state.seekBy);
    const setCurrentTime = useAudioStore(state => state.setCurrentTime);
    const setVolume = useAudioStore(state => state.setVolume);
    const toggleMute = useAudioStore(state => state.toggleMute);

    // 当前卡片是否就是正在播放的音频（通过 feedId + postId + url 来唯一标识）
    const isActive = src === url && playingFeedId === feedId && playingPostId === postId;

    // duration：当前卡片是激活的才使用全局 duration，否则使用自身的初始 duration，避免显示别的音频的时长
    const duration = isActive ? storeDuration || initialDuration || 0 : initialDuration || 0;

    // 当前 slider 正在拖动的时间（只在当前卡片为激活卡片时才会使用）
    const [_currentTime, set_CurrentTime] = useState<number | null>(null);
    // 记录拖动前是否处于播放状态，用于拖动结束后自动恢复播放
    const [wasPlayingBeforeDrag, setWasPlayingBeforeDrag] = useState(false);

    const seekBackward = () => {
        if (!isActive) return;
        seekBy(-SEEK_STEP);
    };

    const seekForward = () => {
        if (!isActive) return;
        seekBy(SEEK_STEP);
    };

    const currentTimeChangeHandler = (values: number[]) => {
        if (!isActive) return;
        // 第一次拖动记录当前是否在播放
        if (!wasPlayingBeforeDrag) {
            setWasPlayingBeforeDrag(isPlaying);
        }
        set_CurrentTime(values[0]);
        pause();
    };
    const currentTimeCommitHandler = (values: number[]) => {
        if (!isActive) return;
        setCurrentTime(values[0]);
        set_CurrentTime(null);
        // 如果拖动前在播放，拖动完成后恢复播放
        if (wasPlayingBeforeDrag) {
            play();
        }
        setWasPlayingBeforeDrag(false);
    };
    const volumeChangeHandler = (values: number[]) => {
        setVolume(values[0]);
    };

    const toggleMuteHandler = () => toggleMute();

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
            {/* <audio className="hidden" ref={audioRef} preload="metadata" src={url}></audio> */}

            {title && (
                <div className="mb-3">
                    <h3 className="text-foreground line-clamp-1 text-sm font-medium">{isActive ? title : title || '音频'}</h3>
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
                            <Button
                                className="h-10 w-10 rounded-full"
                                variant="default"
                                size="icon"
                                onClick={() => {
                                    if (!isActive) {
                                        // 切换为新的音频并开始播放
                                        setTrack({ url, title, duration: initialDuration, feedId, postId });
                                        play();
                                    } else {
                                        togglePlayPause();
                                    }
                                }}
                            >
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

                {duration > 0 && (
                    <div className="flex flex-1 items-center gap-3">
                        <span className="text-muted-foreground min-w-[70px] text-right text-xs font-medium tabular-nums select-none">
                            {formatTime(isActive ? (_currentTime ?? currentTime) : 0)} / {formatTime(duration)}
                        </span>
                        <div className="flex-1">
                            <Slider
                                className="w-full"
                                value={[isActive ? (_currentTime ?? currentTime) : 0]}
                                onValueCommit={currentTimeCommitHandler}
                                onValueChange={currentTimeChangeHandler}
                                min={0}
                                max={duration}
                                step={0.1}
                                disabled={!isActive}
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
