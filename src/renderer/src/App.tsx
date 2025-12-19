import { useState } from 'react';
import { Toaster } from 'sonner';

import Header from '@/components/header';
import Posts from '@/components/posts';
import Sidebar from '@/components/sidebar';

import { cn } from './lib/utils';

function App() {
    const [isDragging, setIsDragging] = useState(false);
    return (
        <>
            <div className={cn('flex h-screen w-full', isDragging ? 'cursor-ew-resize' : 'cursor-auto')}>
                <Sidebar setIsDragging={setIsDragging} />
                <Posts setIsDragging={setIsDragging} />
                <div className="h-full flex-1">
                    <Header />
                </div>
            </div>
            <Toaster toastOptions={{ style: { fontFamily: 'var(--font-custom)' } }} />
        </>
    );
}

export default App;
