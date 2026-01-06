import { Toaster } from 'sonner';

import Sidebar from '@/components/sidebar';
import { cn } from '@/lib/utils';
import { useDragging } from '@/store/common';

import View from './view';

function App() {
    const { isDragging } = useDragging();

    return (
        <>
            <div className={cn('flex h-screen w-screen', isDragging ? 'cursor-ew-resize' : 'cursor-auto')}>
                <Sidebar />
                <View />
            </div>
            <Toaster toastOptions={{ style: { fontFamily: 'var(--font-custom)' } }} />
        </>
    );
}

export default App;
