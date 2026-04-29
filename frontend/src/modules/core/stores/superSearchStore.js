import { create } from 'zustand';

export const useSuperSearchStore = create((set, get) => ({
    query: '',
    activePath: '',
    resultCount: null,
    totalCount: null,

    setQuery: (query) => set({ query }),
    clearQuery: () => set({ query: '', resultCount: null, totalCount: null }),
    setResultMeta: ({ resultCount = null, totalCount = null } = {}) => set({ resultCount, totalCount }),
    setActivePath: (activePath) => {
        const previousPath = get().activePath;
        if (previousPath === activePath) return;

        set({
            activePath,
            query: '',
            resultCount: null,
            totalCount: null,
        });
    },
}));
