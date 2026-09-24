import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";

const DEFAULT_PAGINATION = {
    current: 1,
    pageSize: 10,
};

const createInitialState = (initialOrdering) => ({
    pagination: { ...DEFAULT_PAGINATION },
    filters: {},
    ordering: initialOrdering,
});

const readStoredState = (storageKey, initialOrdering) => {
    const initialState = createInitialState(initialOrdering);
    if (!storageKey) return initialState;

    try {
        const stored = JSON.parse(window.localStorage.getItem(storageKey));
        if (!stored || typeof stored !== "object") return initialState;

        return {
            ...initialState,
            ...stored,
            pagination: {
                ...initialState.pagination,
                ...(stored.pagination && typeof stored.pagination === "object"
                    ? stored.pagination
                    : {}),
            },
            filters: stored.filters && typeof stored.filters === "object"
                ? stored.filters
                : {},
        };
    } catch {
        return initialState;
    }
};

const buildQuery = ({ pagination, filters, ordering }) => {
    const params = new URLSearchParams({
        limit: String(pagination.pageSize),
        offset: String((pagination.current - 1) * pagination.pageSize),
    });

    if (ordering) params.set("ordering", ordering);
    Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
            params.set(key, String(value));
        }
    });

    return params.toString();
};

export const useServerTable = ({ endpoint, storageKey, initialOrdering = "", orderingMap = {} }) => {
    // SSR and the first client render must use identical state. Saved browser
    // preferences are restored only after React has hydrated the page.
    const [tableState, setTableState] = useState(() => createInitialState(initialOrdering));
    const [storageHydrated, setStorageHydrated] = useState(!storageKey);
    const query = useMemo(() => buildQuery(tableState), [tableState]);
    const swrKey = endpoint && storageHydrated ? `${endpoint}?${query}` : null;
    const { data, error, isLoading, isValidating, mutate } = useSWR(swrKey);

    useEffect(() => {
        if (!storageKey) return;

        setTableState(readStoredState(storageKey, initialOrdering));
        setStorageHydrated(true);
    }, [initialOrdering, storageKey]);

    useEffect(() => {
        if (storageKey && storageHydrated) {
            window.localStorage.setItem(storageKey, JSON.stringify(tableState));
        }
    }, [storageHydrated, storageKey, tableState]);

    const onTableChange = (pagination, _filters, sorter) => {
        const sorters = Array.isArray(sorter) ? sorter : [sorter];
        const ordering = sorters
            .filter((item) => item?.field && item?.order)
            .map((item) => {
                const field = orderingMap[item.field] || item.field;
                return `${item.order === "descend" ? "-" : ""}${field}`;
            })
            .join(",");

        setTableState((current) => ({
            ...current,
            pagination: {
                current: pagination.current || 1,
                pageSize: pagination.pageSize || DEFAULT_PAGINATION.pageSize,
            },
            ordering,
        }));
    };

    const setFilters = (filters) => {
        setTableState((current) => ({
            ...current,
            filters,
            pagination: { ...current.pagination, current: 1 },
        }));
    };

    return {
        data,
        error,
        loading: !storageHydrated || isLoading || isValidating,
        tableState,
        onTableChange,
        setFilters,
        refresh: mutate,
    };
};
