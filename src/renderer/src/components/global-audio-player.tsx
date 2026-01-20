import { useAudioStore, useFeedStore, usePostStore } from '@/store';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const SEEK_STEP = 5;

export function GlobalAudioPlayer() {
    // 从全局 audio store 获取状态
    const src = useAudioStore(state => state.src);
    const title = useAudioStore(state => state.title);
    const feedId = useAudioStore(state => state.feedId);
    const postId = useAudioStore(state => state.postId);
    const duration = useAudioStore(state => state.duration);
    const currentTime = useAudioStore(state => state.currentTime);
    const volume = useAudioStore(state => state.volume);
    const isPlaying = useAudioStore(state => state.isPlaying);
    const isMuted = useAudioStore(state => state.isMuted);
    const togglePlayPause = useAudioStore(state => state.togglePlayPause);
    const pause = useAudioStore(state => state.pause);
    const seekBy = useAudioStore(state => state.seekBy);
    const setCurrentTime = useAudioStore(state => state.setCurrentTime);
    const setVolume = useAudioStore(state => state.setVolume);
    const toggleMute = useAudioStore(state => state.toggleMute);
    const setTrack = useAudioStore(state => state.setTrack);

    const setSelectedFeedId = useFeedStore(state => state.setSelectedFeedId);
    const setSelectedPost = usePostStore(state => state.setSelectedPost);
    const posts = usePostStore(state => state.posts);

    // 获取当前播放的 post 信息（用于封面图）
    const currentPost = useMemo(() => {
        if (!postId) return null;
        return posts.find(p => p.id === postId) || null;
    }, [postId, posts]);

    // 当前 slider 正在拖动的时间
    const [_currentTime, set_CurrentTime] = useState<number | null>(null);
    // 记录拖动前是否处于播放状态，用于拖动结束后自动恢复播放
    const [wasPlayingBeforeDrag, setWasPlayingBeforeDrag] = useState(false);

    // 如果没有音频在播放，不显示播放器
    if (!src) {
        return null;
    }

    const formatTimeShort = (seconds: number): string => {
        if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleJumpToPost = () => {
        if (feedId && postId) {
            setSelectedFeedId(feedId);
            setSelectedPost(postId);
        }
    };

    const handleClose = () => {
        pause();
        setTrack({ url: '', title: '', feedId: undefined, postId: undefined });
    };

    const handleDownload = () => {
        if (src) {
            window.open(src, '_blank');
        }
    };

    const seekBackward = () => {
        seekBy(-SEEK_STEP);
    };

    const seekForward = () => {
        seekBy(SEEK_STEP);
    };

    const currentTimeChangeHandler = (values: number[]) => {
        // 第一次拖动记录当前是否在播放
        if (!wasPlayingBeforeDrag) {
            setWasPlayingBeforeDrag(isPlaying);
        }
        set_CurrentTime(values[0]);
        pause();
    };

    const currentTimeCommitHandler = (values: number[]) => {
        setCurrentTime(values[0]);
        set_CurrentTime(null);
        // 如果拖动前在播放，拖动完成后恢复播放
        if (wasPlayingBeforeDrag) {
            togglePlayPause();
        }
        setWasPlayingBeforeDrag(false);
    };

    const volumeChangeHandler = (values: number[]) => {
        setVolume(values[0]);
    };

    const displayTime = _currentTime ?? currentTime;
    const remainingTime = duration > 0 ? duration - displayTime : 0;

    return (
        <>
            <Separator />
            <div className="bg-sidebar border-t-border shrink-0 border-t">
                {/* 顶部控制栏 */}
                <div className="flex items-center justify-between px-3 py-1.5">
                    {/* 左侧控制按钮 */}
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

                    {/* 右侧控制按钮 */}
                    <div className="flex items-center gap-1">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button className="h-7 w-7" variant="ghost" size="icon">
                                    <span className="text-xs font-medium">1x</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>播放速度</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button className="h-7 w-7" variant="ghost" size="icon" onClick={toggleMute}>
                                    <i className={cn('text-sm', volume === 0 || isMuted ? 'i-mingcute-volume-mute-line' : 'i-mingcute-volume-fill')} />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent theme="light">
                                <Slider orientation="vertical" onValueChange={volumeChangeHandler} value={[isMuted ? 0 : volume]} min={0} max={1} step={0.01} />
                            </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button className="h-7 w-7" variant="ghost" size="icon" onClick={seekBackward}>
                                    <i className="i-mingcute-skip-back-line text-sm" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>上一首</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button className="h-7 w-7" variant="ghost" size="icon" onClick={seekForward}>
                                    <i className="i-mingcute-skip-forward-line text-sm" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>下一首</TooltipContent>
                        </Tooltip>
                    </div>
                </div>

                {/* 主要内容区域 */}
                <div className="flex items-center gap-3 px-3 pb-3">
                    {/* 专辑封面 */}
                    <div className="bg-muted relative h-14 w-14 shrink-0 overflow-hidden rounded-lg">
                        {currentPost?.image_url ? (
                            <img className="h-full w-full object-cover" src={currentPost.image_url} alt={title || '封面'} />
                        ) : (
                            <div className="bg-muted-foreground/20 flex h-full w-full items-center justify-center">
                                <i className={cn('text-2xl', isPlaying ? 'i-mingcute-pause-fill' : 'i-mingcute-play-fill')} />
                            </div>
                        )}
                    </div>

                    {/* 音频信息和进度条 */}
                    <div className="min-w-0 flex-1">
                        {/* 标题 */}
                        {title && <div className="text-foreground mb-1 line-clamp-1 text-sm font-medium">{title}</div>}

                        {/* 进度条和时间 */}
                        {duration > 0 && (
                            <div className="flex items-center gap-2">
                                <span className="text-muted-foreground shrink-0 text-xs font-medium tabular-nums select-none">{formatTimeShort(displayTime)}</span>
                                <div className="flex-1">
                                    <Slider
                                        className="w-full"
                                        value={[displayTime]}
                                        onValueCommit={currentTimeCommitHandler}
                                        onValueChange={currentTimeChangeHandler}
                                        min={0}
                                        max={duration}
                                        step={0.1}
                                    />
                                </div>
                                <span className="text-muted-foreground shrink-0 text-xs font-medium tabular-nums select-none">-{formatTimeShort(remainingTime)}</span>
                            </div>
                        )}
                    </div>

                    {/* 播放/暂停按钮 */}
                    <div className="shrink-0">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button className="h-10 w-10 rounded-full" variant="default" size="icon" onClick={togglePlayPause}>
                                    <i className={cn('text-lg', isPlaying ? 'i-mingcute-pause-fill' : 'i-mingcute-play-fill')} />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>{isPlaying ? '暂停' : '播放'}</TooltipContent>
                        </Tooltip>
                    </div>
                </div>
            </div>
        </>
    );
}
