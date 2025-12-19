import { useEffect, useState } from 'react';

import Header from './header';

export default function Sidebar() {
    const [data, setData] = useState<any[]>([]);
    useEffect(() => {
        window.electron.ipcRenderer.invoke('db-get-feeds').then(data => setData(data));
    }, []);
    return (
        <div className="bg-sidebar h-full">
            <Header />
            <div className="mt-10 flex flex-col gap-y-2 px-6 text-sm select-none">
                {data.map(item => (
                    <div key={item.id}>{item.title}</div>
                ))}
            </div>
        </div>
    );
}
