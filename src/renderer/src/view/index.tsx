import { usePostStore } from '@/store';
import { useView } from '@/store';
import { memo } from 'react';
import { useEffect } from 'react';

import Media from './media';
import Posts from './posts';

function View() {
    const view = useView(state => state.view);
    useEffect(() => {
        usePostStore.getState().refreshPosts();
    }, [view]);

    if (view === 1) {
        return <Posts />;
    }
    if (view === 2) {
        return <Media />;
    }
    return null;
}

export default memo(View);
