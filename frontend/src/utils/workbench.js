function pickFirstQueryValue(value) {
    if (Array.isArray(value)) {
        return value[0];
    }
    return value;
}
export function readQueryString(query, key) {
    const value = pickFirstQueryValue(query[key]);
    if (typeof value !== 'string') {
        return undefined;
    }
    const text = value.trim();
    return text ? text : undefined;
}
export function readQueryNumber(query, key) {
    const text = readQueryString(query, key);
    if (typeof text === 'undefined') {
        return undefined;
    }
    const value = Number(text);
    return Number.isFinite(value) ? value : undefined;
}
export function readQueryEnum(query, key, options) {
    const value = readQueryString(query, key);
    if (!value) {
        return undefined;
    }
    return options.includes(value) ? value : undefined;
}
