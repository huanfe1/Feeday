export function formatObject(obj: Object) {
    return JSON.parse(JSON.stringify(obj, (_, value) => (value === undefined ? null : value)));
}

export function undefined2null(obj: Object) {
    return JSON.parse(JSON.stringify(obj, (_, value) => (value === undefined ? null : value)));
}

export function truncate(str: string, length = 60) {
    if (typeof str !== 'string' || str.trim() === '') return;
    str = str
        .trimStart()
        .replace(/<[^>]+>/gi, '')
        .replace(/\s+/g, ' ')
        .trim()
        .split('\n')[0];
    const omission = '...';
    const omissionLength = omission.length;
    if (str.length <= length) return str;
    return str.slice(0, length - omissionLength) + omission;
}
