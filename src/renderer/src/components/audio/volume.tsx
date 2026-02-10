import { useAudioStore } from '@/store';
import { memo, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export const VolumeBar = memo(function VolumeBar() {
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
            <Tooltip onOpenChange={handleOpenChange} open={tooltipOpen}>
                <TooltipTrigger asChild>
                    <Button className="h-9 w-9" onClick={toggleMute} size="icon" variant="ghost">
                        <i className={cn('text-sm', volume === 0 || isMuted ? 'i-mingcute-volume-mute-line' : 'i-mingcute-volume-fill')} />
                    </Button>
                </TooltipTrigger>
                <TooltipContent onPointerDown={() => handleDrag(true)} onPointerUp={() => handleDrag(false)} theme="light">
                    <Slider
                        max={1}
                        min={0}
                        onPointerDown={() => handleDrag(true)}
                        onPointerUp={() => handleDrag(false)}
                        onValueChange={volumeChangeHandler}
                        orientation="vertical"
                        step={0.01}
                        value={[displayVolume]}
                    />
                </TooltipContent>
            </Tooltip>
        </div>
    );
});
