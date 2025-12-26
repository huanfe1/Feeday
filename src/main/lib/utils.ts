export function formatObject(obj: Object) {
    return JSON.parse(JSON.stringify(obj, (_, value) => (value === undefined ? null : value)));
}

export function undefined2null(obj: Object) {
    return JSON.parse(JSON.stringify(obj, (_, value) => (value === undefined ? null : value)));
}
