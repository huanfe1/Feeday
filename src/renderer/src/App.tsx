import { useState } from 'react';
import { Toaster } from 'sonner';

import Header from '@/components/header';
import Post from '@/components/post';
import Posts from '@/components/posts';
import Sidebar from '@/components/sidebar';
import { ScrollArea } from '@/components/ui/scroll-area';

import { cn } from './lib/utils';

function App() {
    const [isDragging, setIsDragging] = useState(false);

    return (
        <>
            <div className={cn('flex h-screen w-screen', isDragging ? 'cursor-ew-resize' : 'cursor-auto')}>
                <Sidebar setIsDragging={setIsDragging} />
                <Posts setIsDragging={setIsDragging} />
                <div className="flex h-full min-w-0 flex-1 flex-col">
                    <Header />
                    <ScrollArea className="min-h-0 flex-1">
                        <Post />
                    </ScrollArea>
                </div>
            </div>
            <Toaster toastOptions={{ style: { fontFamily: 'var(--font-custom)' } }} />
        </>
    );
}

export default App;
