import axios from "axios";
import { getToken, encode as encodeJwt } from "next-auth/jwt";

// Helper: refresh via Djoser + SimpleJWT
async function tryRefresh(refreshToken) {
    if (!refreshToken) return null;
    try {
        const { data } = await axios.post(
            `${process.env.DJANGO_API_BASE}/auth/jwt/refresh/`,
            { refresh: refreshToken }
        );
        const newAccess = data.access;
        if (!newAccess) return null;

        // get exp (seconds) -> ms
        let expMs = null;
        try {
            const [, payload] = newAccess.split(".");
            const { exp } = JSON.parse(Buffer.from(payload, "base64").toString());
            expMs = exp * 1000;
        } catch {}
        return { access: newAccess, refresh: data.refresh || refreshToken, expMs };
    } catch {
        return null;
    }
}

function setLogoutCookies(res) {
    const names =
        process.env.NODE_ENV === "production"
            ? ["__Secure-next-auth.session-token"]
            : ["next-auth.session-token"];
    res.setHeader("Set-Cookie", names.map(
        (name) =>
            `${name}=; Path=/; HttpOnly; SameSite=Lax; ${
                process.env.NODE_ENV === "production" ? "Secure; " : ""
            }Max-Age=0`
    ));
}

export default async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).end();

    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.refreshToken) {
        setLogoutCookies(res);
        return res.status(401).json({ detail: "No refresh token" });
    }

    const refreshed = await tryRefresh(token.refreshToken);
    if (!refreshed?.access) {
        setLogoutCookies(res);
        return res.status(401).json({ detail: "Refresh failed" });
    }

    // 3) Create an updated token payload
    const updatedToken = {
        ...token,
        accessToken: refreshed.access,
        refreshToken: refreshed.refresh,
        accessTokenExpires: refreshed.expMs || Date.now() + 5 * 60 * 1000, // fallback 5min
        error: undefined,
    };

    // 4) Re-encode a NextAuth JWT and set it as the session cookie
    //    (NextAuth default session maxAge is 30 days)
    const encoded = await encodeJwt({
        token: updatedToken,
        secret: process.env.NEXTAUTH_SECRET,
        maxAge: 30 * 24 * 60 * 60, // seconds
    });

    // Cookie name: __Secure-... on HTTPS in prod, else next-auth.session-token
    const cookieName =
        process.env.NODE_ENV === "production"
            ? "__Secure-next-auth.session-token"
            : "next-auth.session-token";

    const isProd = process.env.NODE_ENV === "production";

    res.setHeader("Set-Cookie", [
        `${cookieName}=${encoded}; Path=/; HttpOnly; SameSite=Lax; ${
            isProd ? "Secure; " : ""
        }Max-Age=${30 * 24 * 60 * 60}`,
    ]);

    res.status(200).json({ ok: true });
}
