import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

import { loadEnv } from '@tutorcrm/config';
import { loginRequestSchema, type Role, type UserPublic } from '@tutorcrm/contracts';

import { usersStore, verifyPassword } from '@/mocks/store';

const env = loadEnv();

export const authOptions: NextAuthOptions = {
  secret: env.NEXTAUTH_SECRET,
  session: {
    strategy: 'jwt',
    maxAge: 60 * 60 * 24 * 7,
  },
  pages: {
    signIn: '/login',
  },
  providers: [
    CredentialsProvider({
      id: 'credentials',
      name: 'Email + password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(raw) {
        const parsed = loginRequestSchema.safeParse(raw);
        if (!parsed.success) return null;

        const all = await usersStore.list();
        const user = all.find(
          (u) => u.email.toLowerCase() === parsed.data.email.toLowerCase(),
        );
        if (!user) return null;
        if (user.status !== 'active') return null;
        if (!verifyPassword(user.id, parsed.data.password)) return null;

        const publicUser: UserPublic = {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status,
        };
        return publicUser as unknown as { id: string } & UserPublic;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as unknown as UserPublic;
        token.uid = u.id;
        token.email = u.email;
        token.name = u.name;
        token.role = u.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.uid && session.user) {
        session.user.id = String(token.uid);
        session.user.role = token.role as Role;
        session.user.email = String(token.email ?? session.user.email);
        session.user.name = String(token.name ?? session.user.name);
      }
      return session;
    },
  },
};
