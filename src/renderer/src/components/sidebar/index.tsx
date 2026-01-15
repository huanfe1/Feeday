import { memo } from 'react';

import { Resizable } from '@/components/resizable';
import { Separator } from '@/components/ui/separator';

import Settings from '../settings';
import AddFeed from './addFeed';
import Feeds from './feeds';

function Sidebar() {
    return (
        <Resizable options={{ axis: 'x', min: 200, max: 300, initial: 250 }}>
            <div className="bg-sidebar flex h-full flex-col">
                <div className="drag-region flex h-[60px] justify-between px-3">
                    <div className="flex items-center gap-1">
                        <i className="i-mingcute-follow-fill text-4xl text-[#FF5C00]" />
                        <span className="font-bold">Folo</span>
                    </div>
                    <div className="no-drag-region flex items-center">
                        <AddFeed />
                        <Settings />
                    </div>
                </div>
                <Separator />
                <Feeds />
            </div>
        </Resizable>
    );
}

export default memo(Sidebar);
