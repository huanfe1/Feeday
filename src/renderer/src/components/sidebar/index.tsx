import { memo } from 'react';

import { Logo, LogoText } from '@/components/icon';
import Resizable from '@/components/resizable';
import { Separator } from '@/components/ui/separator';

import { GlobalAudioPlayer } from '../global-audio-player';
import Settings from '../settings';
import AddFeed from './addFeed';
import Feeds from './feeds';

function Sidebar() {
    return (
        <Resizable id="feeds-sidebar" options={{ axis: 'x', min: 200, max: 300, initial: 250 }}>
            <div className="bg-sidebar flex h-full flex-col">
                <div className="drag-region flex h-15 justify-between px-3">
                    <div className="flex items-center gap-1">
                        <Logo className="size-10" />
                        <LogoText className="mt-1 ml-1" />
                    </div>
                    <div className="no-drag-region flex items-center">
                        <AddFeed />
                        <Settings />
                    </div>
                </div>
                <Separator />
                <Feeds />
                <GlobalAudioPlayer />
            </div>
        </Resizable>
    );
}

export default memo(Sidebar);
