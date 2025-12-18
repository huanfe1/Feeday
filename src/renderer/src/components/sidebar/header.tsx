import AddFeed from '@/components/addFeed';

export default function Header() {
    return (
        <div className="drag-region flex h-[60px] justify-between px-3">
            <div className="flex items-center gap-1">
                <i className="i-mingcute-follow-fill text-4xl text-[#FF5C00]"></i>
                <span className="font-bold">Folo</span>
            </div>
            <div className="no-drag-region flex items-center">
                <AddFeed />
            </div>
        </div>
    );
}
