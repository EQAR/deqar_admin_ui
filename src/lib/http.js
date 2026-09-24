import axios from "axios";

let refreshPromise = null; // singleton to avoid multiple concurrent refreshes

async function persistRefresh() {
    // Ask our API to refresh and persist the NextAuth cookie
    const res = await fetch("/api/auth/persist-refresh", { method: "POST" });
    if (!res.ok) {
        const err = new Error("Refresh failed");
        err.status = res.status;
        throw err;
    }
}

async function signOutNow() {
    try {
        const { signOut } = await import("next-auth/react");
        await signOut({ callbackUrl: "/login" });
    } catch {
        // fallback
        if (typeof window !== "undefined") window.location.href = "/login";
    }
}

export const http = axios.create({
    baseURL: "/api/proxy", // go through your server BFF
    withCredentials: true,
});

// Response interceptor: on 401, try once to refresh+retry; else sign out
http.interceptors.response.use(
    (res) => res,
    async (error) => {
        const status = error?.response?.status;
        const original = error?.config || {};

        // Only handle 401s, avoid infinite loops
        if (status !== 401 || original.__isRetry) {
            // let SWR see the error for its retry policy
            return Promise.reject(error);
        }

        // De-dup refresh attempts
        if (!refreshPromise) {
            refreshPromise = persistRefresh().finally(() => {
                refreshPromise = null;
            });
        }

        try {
            await refreshPromise; // wait for refresh result
            // retry once with a mark to avoid loops
            original.__isRetry = true;
            return http.request(original);
        } catch {
            // refresh failed -> log out
            await signOutNow();
            return Promise.reject(error);
        }
    }
);
