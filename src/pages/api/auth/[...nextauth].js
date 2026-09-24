import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import axios from "axios";

async function refreshAccessToken(token) {
    try {
        const { data } = await axios.post(
            `${process.env.DJANGO_API_BASE}/auth/jwt/refresh/`,
            { refresh: token.refreshToken }
        );
        const newAccess = data.access;

        // Decode JWT exp (seconds) from access token
        const [, payload] = newAccess.split(".");
        const { exp } = JSON.parse(Buffer.from(payload, "base64").toString());

        return {
            ...token,
            accessToken: newAccess,
            refreshToken: data.refresh || token.refreshToken,
            accessTokenExpires: exp * 1000, // ms
            error: undefined,
        };
    } catch {
        return { ...token, error: "RefreshAccessTokenError" };
    }
}

export const authOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                username: { label: "Username", type: "username" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.username || !credentials?.password) return null;
                try {
                    const { data } = await axios.post(
                        `${process.env.DJANGO_API_BASE}/auth/jwt/create/`,
                        { username: credentials.username, password: credentials.password }
                    );

                    // Optional: fetch profile
                    const me = await axios.get(`${process.env.DJANGO_API_BASE}/auth/users/me/`, {
                        headers: { Authorization: `JWT ${data.access}` },
                    });

                    // Decode access exp to track expiry
                    const [, payload] = data.access.split(".");
                    const { exp } = JSON.parse(Buffer.from(payload, "base64").toString());

                    return {
                        id: String(me.data.id ?? me.data.pk ?? me.data.email),
                        email: me.data.email,
                        name: me.data.username ?? me.data.email,
                        // attach tokens; they will land in `token` on jwt() callback
                        accessToken: data.access,
                        refreshToken: data.refresh,
                        accessTokenExpires: exp * 1000, // ms
                        profile: me.data,
                    };
                } catch (e) {
                    return null;
                }
            },
        }),
    ],

    session: { strategy: "jwt" },

    callbacks: {
        async jwt({ token, user }) {
            // Initial sign-in
            if (user) {
                return {
                    ...token,
                    accessToken: user.accessToken,
                    refreshToken: user.refreshToken,
                    accessTokenExpires: user.accessTokenExpires,
                    profile: user.profile,
            };
            }

            // If access token hasn’t expired, return previous token
            const now = Date.now();
            if (token.accessToken && token.accessTokenExpires && now < token.accessTokenExpires) {
                return token;
            }

            // Access token expired, try to refresh
            if (token.refreshToken) {
                return await refreshAccessToken(token);
            }

            // No refresh token -> force sign-in
            return { ...token, error: "NoRefreshToken" };
        },

        async session({ session, token }) {
            session.user = token.profile ?? session.user;
            session.accessToken = token.accessToken;
            session.error = token.error;
            return session;
        },
    },

    // Cookies are httpOnly/secure by default in production
    secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);
