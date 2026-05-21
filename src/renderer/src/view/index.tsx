import { useStore } from '@/store';
import { memo } from 'react';

import Media from './media';
import Posts from './posts';

function View() {
    const view = useStore(state => state.view);

    if (view === 1) return <Posts />;
    if (view === 2) return <Media />;
    return null;
}

export default memo(View);
