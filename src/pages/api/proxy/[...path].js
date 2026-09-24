import axios from "axios";
import { encode as encodeJwt, getToken } from "next-auth/jwt";

export const config = { api: { bodyParser: false } };

const refreshPromises = new Map();

// Read raw body for non-GET requests
async function readBody(req) {
    return new Promise((resolve) => {
        const chunks = [];
        req.on("data", (chunk) => chunks.push(chunk));
        req.on("end", () => resolve(Buffer.concat(chunks)));
    });
}

function setLogoutCookies(res) {
    const names =
        process.env.NODE_ENV === "production"
            ? ["__Secure-next-auth.session-token"]
            : ["next-auth.session-token"];
    for (const name of names) {
        res.setHeader("Set-Cookie", [
            ...(Array.isArray(res.getHeader("Set-Cookie"))
                ? res.getHeader("Set-Cookie")
                : res.getHeader("Set-Cookie")
                    ? [res.getHeader("Set-Cookie")]
                    : []),
            `${name}=; Path=/; HttpOnly; SameSite=Lax; ${
                process.env.NODE_ENV === "production" ? "Secure; " : ""
            }Max-Age=0`,
        ]);
    }
}

function appendCookie(res, cookie) {
    const current = res.getHeader("Set-Cookie");
    const cookies = Array.isArray(current) ? current : current ? [current] : [];
    res.setHeader("Set-Cookie", [...cookies, cookie]);
}

async function persistToken(res, token, refreshed) {
    const updatedToken = {
        ...token,
        accessToken: refreshed.access,
        refreshToken: refreshed.refresh,
        accessTokenExpires: refreshed.expMs || Date.now() + 5 * 60 * 1000,
        error: undefined,
    };
    const encoded = await encodeJwt({
        token: updatedToken,
        secret: process.env.NEXTAUTH_SECRET,
        maxAge: 30 * 24 * 60 * 60,
    });
    const isProduction = process.env.NODE_ENV === "production";
    const cookieName = isProduction
        ? "__Secure-next-auth.session-token"
        : "next-auth.session-token";

    appendCookie(
        res,
        `${cookieName}=${encoded}; Path=/; HttpOnly; SameSite=Lax; ${
            isProduction ? "Secure; " : ""
        }Max-Age=${30 * 24 * 60 * 60}`,
    );
}


// Refresh via Djoser + SimpleJWT -> { access, refresh, expMs } | null
async function tryRefresh(refreshToken) {
    if (!refreshToken) return null;
    try {
        const { data } = await axios.post(
            `${process.env.DJANGO_API_BASE}/auth/jwt/refresh/`,
            { refresh: refreshToken }
        );
        const newAccess = data?.access;
        if (!newAccess) return null;

        let expMs = null;
        try {
            const [, payload] = newAccess.split(".");
            const { exp } = JSON.parse(Buffer.from(payload, "base64").toString());
            expMs = exp * 1000;
        } catch {}
        return { access: newAccess, refresh: data?.refresh || refreshToken, expMs };
    } catch {
        return null;
    }
}

function refreshOnce(refreshToken) {
    if (!refreshPromises.has(refreshToken)) {
        const refreshPromise = tryRefresh(refreshToken)
            .finally(() => refreshPromises.delete(refreshToken));
        refreshPromises.set(refreshToken, refreshPromise);
    }
    return refreshPromises.get(refreshToken);
}

export default async function handler(req, res) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    if (!token) {
        setLogoutCookies(res);
        return res.status(401).json({ detail: "Session expired" });
    }

    const { path = [], ...query } = req.query;
    const targetPath = Array.isArray(path) ? path.join("/") : path;
    const apiBase = process.env.DJANGO_API_BASE.replace(/\/+$/, "");
    const normalizedPath = targetPath.replace(/^\/+|\/+$/g, "");
    const targetUrl = new URL(`${apiBase}/${normalizedPath}/`);
    Object.entries(query).forEach(([key, value]) => {
        if (Array.isArray(value)) {
            value.forEach((item) => targetUrl.searchParams.append(key, item));
        } else if (value !== undefined) {
            targetUrl.searchParams.set(key, value);
        }
    });
    const body = ["GET", "HEAD"].includes(req.method) ? undefined : await readBody(req);

    // helper to forward request (so we can retry once)
    const forward = async (bearer) => {
        return axios.request({
            url: targetUrl.toString(),
            method: req.method,
            data: body,
            headers: {
                ...(req.headers["content-type"] ? { "Content-Type": req.headers["content-type"] } : {}),
                ...(bearer ? { Authorization: `JWT ${bearer}` } : {}),
            },
            responseType: "arraybuffer",
            validateStatus: () => true,
        });
    };

    try {
        let bearer = token.accessToken || null;
        let refreshed = null;
        const accessExpired = !bearer || (
            typeof token.accessTokenExpires === "number" &&
            Date.now() >= token.accessTokenExpires - 5000
        );

        if (accessExpired && token.refreshToken) {
            refreshed = await refreshOnce(token.refreshToken);
            bearer = refreshed?.access || null;
        }

        if (!bearer) {
            setLogoutCookies(res);
            return res.status(401).json({ detail: "Session expired" });
        }

        let response = await forward(bearer);

        // Handle server-side expiry or revocation that occurred before the local expiry time.
        if (response.status === 401 && token.refreshToken && !refreshed) {
            refreshed = await refreshOnce(token.refreshToken);
            if (refreshed?.access) response = await forward(refreshed.access);
        }

        if (refreshed?.access) {
            await persistToken(res, token, refreshed);
            res.setHeader("X-Proxy-Refreshed", "1");
        }

        if (response.status === 401) {
            setLogoutCookies(res);
        }

        // Mirror upstream response
        res.status(response.status);
        for (const [key, value] of Object.entries(response.headers)) {
            if (["set-cookie", "transfer-encoding"].includes(key.toLowerCase())) continue;
            try {
                res.setHeader(key, value);
            } catch {}
        }
        res.send(Buffer.from(response.data));
    } catch (err) {
        console.error("Proxy error:", err?.message);
        res.status(500).json({ detail: "Proxy error" });
    }
}
