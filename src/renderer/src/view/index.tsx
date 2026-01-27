import { memo } from 'react';

import { useView } from '@/store/common';

import Media from './media';
import Posts from './posts';

function View() {
    const view = useView(state => state.view);

    return (
        <>
            <Posts />
            {/* <Media /> */}
        </>
    );

    // if (view === 1) {
    //     return <Posts />;
    // }
    // // if (view === 2) {
    // //     return <Media />;
    // // }
    // return null;
}

export default memo(View);
