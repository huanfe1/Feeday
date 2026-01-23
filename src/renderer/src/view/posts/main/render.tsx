import type { AudioTrack } from '@/store';
import { useAudioStore } from '@/store';
import parse, { Element } from 'html-react-parser';
import type { HTMLReactParserOptions } from 'html-react-parser';
import { memo } from 'react';
import sanitizeHtml from 'sanitize-html';

function Render({ content, podcast }: { content: string; podcast: AudioTrack['podcast'] & { postId: number } }) {
    const postId = useAudioStore(state => state.postId);
    const setCurrentTime = useAudioStore(state => state.setCurrentTime);
    const duration = useAudioStore(state => state.duration);

    const handleClickTime = (time: string) => {
        if (!podcast?.url || postId !== podcast.postId) return;
        const timeArr = time.split(':').map(Number);
        let seconds = 0;
        const timeMap = [1, 60, 3600];
        timeArr.forEach((item, index) => {
            seconds += item * timeMap[timeArr.length - index - 1];
        });
        if (seconds > (podcast.duration ?? duration)) return;
        setCurrentTime(seconds);
    };

    const options: HTMLReactParserOptions = {
        replace: domNode => {
            if (domNode instanceof Element && domNode.attribs) {
                if (domNode.name === 'a') {
                    const timeRegex = /^\d{1,2}:\d{2}(?::\d{2})?$/;
                    const children = domNode.children.map(child => (child.type === 'text' ? child.data : '')).join('');
                    if (timeRegex.test(children)) {
                        return (
                            <span className="cursor-pointer font-semibold text-blue-500 hover:underline" onClick={() => handleClickTime(children)}>
                                {children}
                            </span>
                        );
                    }
                    const href = domNode.attribs.href?.replace(/^.*http/, 'http')?.replace('javascript:', '') || '';
                    return (
                        <a className="no-underline hover:underline" href={href} target="_blank" rel="noopener noreferrer">
                            {domNode.children.map(child => (child.type === 'text' ? child.data : null))}
                        </a>
                    );
                }
                if (domNode.name === 'h1') {
                    return <h2>{domNode.children.map(child => (child.type === 'text' ? child.data : null))}</h2>;
                }
                if (domNode.name === 'img') {
                    return <img src={domNode.attribs.src} alt={domNode.attribs.alt} loading="lazy" />;
                }
            }
            return null;
        },
    };
    return parse(
        sanitizeHtml(content, {
            allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
        }),
        options,
    );
}

export default memo(Render);
