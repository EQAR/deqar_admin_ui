// /proxy.js
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const PUBLIC = [
    "/login",
    "/register",
    "/api/auth",
    "/_next",
    "/images",
    "/favicon.ico",
    "/robots.txt",
    "/sitemap.xml",
];

function clearNextAuthCookies(res) {
    const names =
        process.env.NODE_ENV === "production"
            ? ["__Secure-next-auth.session-token"]
            : ["next-auth.session-token"];
    for (const name of names) {
        res.cookies.set(name, "", {
            path: "/",
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            maxAge: 0,
        });
    }
}

export async function middleware(req) {
    const { pathname, search } = req.nextUrl;

    if (PUBLIC.some((p) => pathname.startsWith(p))) {
        return NextResponse.next();
    }

    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    // No session -> go to login
    if (!token) {
        const url = req.nextUrl.clone();
        url.pathname = "/login";
        if (pathname !== "/") url.searchParams.set("next", pathname + (search || ""));
        return NextResponse.redirect(url);
    }

    // A valid refresh token lets the API proxy renew an expired access token.
    // Only force logout here when the session is no longer refreshable.
    const expired =
        typeof token.accessTokenExpires === "number" &&
        Date.now() > token.accessTokenExpires;

    const hasError = token.error === "RefreshAccessTokenError" || token.error === "NoRefreshToken";

    if (hasError || (expired && !token.refreshToken)) {
        const url = req.nextUrl.clone();
        url.pathname = "/login";
        if (pathname !== "/") url.searchParams.set("next", pathname + (search || ""));
        const res = NextResponse.redirect(url);
        clearNextAuthCookies(res);
        return res;
    }

    // All good
    return NextResponse.next();
}

export const config = {
    // API handlers return API responses themselves; never redirect them to an HTML login page.
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
