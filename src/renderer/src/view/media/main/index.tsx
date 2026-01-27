import { usePostStore } from '@/store';
import type { HTMLReactParserOptions } from 'html-react-parser';
import parser from 'html-react-parser';
import { memo, useEffect, useMemo, useRef, useState } from 'react';

import { ScrollArea } from '@/components/ui/scroll-area';

const options: HTMLReactParserOptions = {
    replace: domNode => {
        if (domNode.type === 'tag') {
            if (domNode.name === 'video') {
                const source = domNode.childNodes.find(node => node.type === 'tag' && node.name === 'source');
                // if (source) {
                //     return <video className="w-full" src={source.attribs.src} />;
                // }
                // return <img className="w-full" src={domNode.attribs.poster} alt="" />;
                return <MediaItem img_url={domNode.attribs.poster} video_url={source?.attribs?.src} />;
            }
            if (domNode.name === 'img') {
                return <img src={domNode.attribs.src} alt={domNode.attribs.alt} loading="lazy" />;
            }
        }
        return null;
    },
};

function Main() {
    const mediaList = usePostStore(state => state.posts);

    if (mediaList.length === 0) return null;
    return (
        <ScrollArea className="min-h-0 flex-1 pt-3">
            <div className="grid grid-cols-3 gap-2 px-4 2xl:grid-cols-4">
                {mediaList.map(media => (
                    <div className="overflow-hidden rounded p-2 transition-colors hover:bg-gray-200" key={media.id} onDoubleClick={() => window.open(media.link, '_blank')}>
                        {/* <div className="aspect-video overflow-hidden rounded">{parser(media.summary, options)}</div> */}
                        <MediaItem content={media.summary} />
                        <div className="mt-2 truncate text-sm font-medium text-gray-600 select-none">{media.title}</div>
                    </div>
                ))}
            </div>
        </ScrollArea>
    );
}

const MediaItem = memo(function MediaItem({ content }: { content?: string }) {
    const [isHovered, setIsHovered] = useState(false);
    const [canPlayVideo, setCanPlayVideo] = useState(false);
    const [videoError, setVideoError] = useState(false);
    const [shouldLoadVideo, setShouldLoadVideo] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const hasTriedLoadRef = useRef(false);

    // 解析 HTML 内容，提取视频信息
    const videoInfo = useMemo(() => {
        if (!content) return null;
        const parser = new DOMParser();
        const doc = parser.parseFromString(content, 'text/html');
        const video = doc.querySelector('video');

        if (video) {
            const poster = video.getAttribute('poster');
            const source = video.querySelector('source');
            const videoUrl = source?.getAttribute('src') || video.getAttribute('src');

            if (poster && videoUrl) {
                return { poster, videoUrl };
            }
        }

        // 如果不是视频，返回 null，使用默认的 parser
        return null;
    }, [content]);

    // 当需要加载视频时，强制开始加载（只加载一次，如果失败就不再尝试）
    useEffect(() => {
        if (shouldLoadVideo && videoRef.current && videoInfo && !videoError && !hasTriedLoadRef.current) {
            hasTriedLoadRef.current = true;
            // 确保视频不会自动加载
            videoRef.current.preload = 'none';
            videoRef.current.load();
        }
    }, [shouldLoadVideo, videoInfo, videoError]);

    // 当视频可以播放且鼠标悬停时，自动播放视频
    useEffect(() => {
        if (videoInfo && canPlayVideo && isHovered && videoRef.current) {
            videoRef.current.play().catch(console.error);
        }
    }, [videoInfo, canPlayVideo, isHovered]);

    if (!content) return null;

    // 如果是视频且有 poster，使用自定义渲染
    if (videoInfo) {
        const handleMouseEnter = () => {
            setIsHovered(true);
            // 鼠标移入时开始加载视频（如果还没加载且没有错误）
            if (!shouldLoadVideo && !videoError && !hasTriedLoadRef.current) {
                setShouldLoadVideo(true);
            }
        };

        const handleMouseLeave = () => {
            setIsHovered(false);
            if (videoRef.current) {
                videoRef.current.pause();
            }
        };

        const handleVideoCanPlay = () => {
            setCanPlayVideo(true);
            setVideoError(false);
        };

        const handleVideoError = () => {
            setCanPlayVideo(false);
            setVideoError(true);
            // 加载失败后，立即移除视频元素以避免重复请求
            // 先清除视频源，防止浏览器自动重试
            if (videoRef.current) {
                videoRef.current.removeAttribute('src');
            }
            // 然后移除视频元素
            setShouldLoadVideo(false);
        };

        return (
            <div className="relative aspect-video w-full overflow-hidden rounded" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
                <img className="absolute inset-0 h-full w-full object-cover" src={videoInfo.poster} alt="" />
                {shouldLoadVideo && !videoError && (
                    <video
                        className={`absolute inset-0 h-full w-full object-cover transition-opacity ${canPlayVideo && isHovered ? 'opacity-100' : 'opacity-0'}`}
                        ref={videoRef}
                        src={videoInfo.videoUrl}
                        muted
                        loop
                        onCanPlay={handleVideoCanPlay}
                        onError={handleVideoError}
                        preload="none"
                    />
                )}
            </div>
        );
    }

    // 其他内容使用默认解析
    return parser(content, options);
});

export default Main;
