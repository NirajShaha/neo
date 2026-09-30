import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";

type BackendUser = {
  id: string;
  email: string;
  name: string;
  groups: string[];
};

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      name: "NEO Login",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: credentials.email,
            password: credentials.password,
          }),
        });
        if (!response.ok) return null;
        const data = (await response.json()) as {
          token: string;
          user: BackendUser;
        };
        return {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
          backendToken: data.token,
          groups: data.user.groups ?? [],
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      const record = token as unknown as Record<string, unknown>;
      if (user) {
        const extended = user as unknown as {
          backendToken?: string;
          groups?: string[];
        };
        record.backendToken = extended.backendToken;
        record.groups = extended.groups ?? [];
      }
      return token;
    },
    async session({ session, token }) {
      const tokenRecord = token as unknown as Record<string, unknown>;
      const sessionRecord = session as unknown as Record<string, unknown>;
      sessionRecord.backendToken = tokenRecord.backendToken;
      const userRecord = (sessionRecord.user ?? {}) as Record<string, unknown>;
      userRecord.groups = tokenRecord.groups ?? [];
      sessionRecord.user = userRecord;
      return session;
    },
  },
});
