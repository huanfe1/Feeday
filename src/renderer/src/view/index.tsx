import { useView } from '@/store/common';

import Posts from './posts';

export default function View() {
    const { view } = useView();

    if (view === 1) {
        return <Posts />;
    }
    return <div>View</div>;
}
