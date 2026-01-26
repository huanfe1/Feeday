import { memo } from 'react';

import Header from '@/components/header';

import Main from './main';
import Sidebar from './sidebar';

function Posts() {
    return (
        <>
            <Sidebar />
            <div className="flex h-full min-w-0 flex-1 flex-col">
                <Header />
                <Main />
            </div>
        </>
    );
}

export default memo(Posts);
