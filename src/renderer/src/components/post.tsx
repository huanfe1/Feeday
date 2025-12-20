import dayjs from 'dayjs';
import parse from 'html-react-parser';
import sanitizeHtml from 'sanitize-html';

import { usePost } from '@/lib/store';

export default function Post() {
    const { post } = usePost();
    return (
        <div>
            <div className="prose max-w-none px-20 py-10">
                <div className="border-border mb-8 border-b pb-6">
                    <h1 className="text-foreground mb-4 text-2xl leading-tight font-bold">{post.title}</h1>
                    <div className="text-muted-foreground flex items-center gap-4 text-sm">
                        {post.author && (
                            <div className="flex items-center gap-1.5">
                                <i className="i-mingcute-user-3-line h-4 w-4" />
                                <span>{post.author}</span>
                            </div>
                        )}
                        {post.pubDate && (
                            <div className="flex items-center gap-1.5">
                                <i className="i-mingcute-calendar-time-add-line h-4 w-4" />
                                <span>{dayjs(post.pubDate).format('YYYY-MM-DD')}</span>
                            </div>
                        )}
                    </div>
                </div>
                <div>{post.content && parse(sanitizeHtml(post.content))}</div>
            </div>
        </div>
    );
}
