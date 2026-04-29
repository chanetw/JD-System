const flattenValue = (value) => {
    if (value === null || value === undefined) return [];
    if (Array.isArray(value)) return value.flatMap(flattenValue);
    if (typeof value === 'object') return Object.values(value).flatMap(flattenValue);
    return [String(value)];
};

export const normalizeSuperSearchText = (value) =>
    flattenValue(value)
        .join(' ')
        .toLowerCase()
        .trim();

export const matchesSuperSearch = (item, query, selectors = []) => {
    const normalizedQuery = normalizeSuperSearchText(query);
    if (!normalizedQuery) return true;

    const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return true;

    const searchableText = selectors
        .flatMap((selector) => {
            try {
                return flattenValue(typeof selector === 'function' ? selector(item) : item?.[selector]);
            } catch {
                return [];
            }
        })
        .join(' ')
        .toLowerCase();

    return tokens.every((token) => searchableText.includes(token));
};
