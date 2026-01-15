import { memo } from 'react';

import { useView } from '@/store/common';

import Posts from './posts';

function View() {
    const { view } = useView();

    if (view === 1) {
        return <Posts />;
    }
    return <div>View</div>;
}

export default memo(View);
