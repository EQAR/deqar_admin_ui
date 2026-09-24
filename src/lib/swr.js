import useSWR, { SWRConfig } from "swr";
import { http } from "./http";

export const fetcher = async (url) => {
    const response = await http.get(url);
    const contentType = response.headers?.["content-type"] || "";

    if (contentType.includes("text/html")) {
        const error = new Error("The API returned an HTML page instead of JSON.");
        error.response = response;
        throw error;
    }

    return response.data;
};

// Optional helper hook
export function useGet(url, swrOpts) {
    return useSWR(url, fetcher, swrOpts);
}

// Default config to be placed in _app.jsx
export const swrDefaults = {
    fetcher,
    revalidateOnFocus: true,
    shouldRetryOnError: (err) => {
        const status = err?.response?.status;
        // Don't retry on 401/403; let the interceptor sign out
        if (status === 401 || status === 403) return false;
        // Retry on 5xx
        return status >= 500;
    },
    errorRetryCount: 3,
    errorRetryInterval: 1500,
};
