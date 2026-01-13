export type FeedType = {
    id: number;
    title: string;
    description?: string;
    link: string;
    url: string;
    last_updated?: string;
    icon?: string;
    last_fetch: string;
    last_fetch_error?: string;
    fetch_frequency: number;
};

export type PostType = {
    id: number;
    feed_id: number;
    title: string;
    link: string;
    author: string;
    image_url?: string;
    summary?: string;
    pub_date: string;
    content?: string;
    is_read: boolean;
};
