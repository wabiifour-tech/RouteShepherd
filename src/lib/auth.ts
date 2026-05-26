import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || 'placeholder',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'placeholder',
    }),
    CredentialsProvider({
      id: 'coordinator',
      name: 'Coordinator Login',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || user.role !== 'coordinator') {
          throw new Error('Invalid coordinator credentials');
        }

        if (!user.passwordHash) {
          throw new Error('Invalid coordinator credentials');
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!isValid) {
          throw new Error('Invalid coordinator credentials');
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          provider: user.provider,
        };
      },
    }),
    CredentialsProvider({
      id: 'driver',
      name: 'Driver Login',
      credentials: {
        email: { label: 'Email', type: 'email' },
      },
      async authorize(credentials) {
        if (!credentials?.email) {
          throw new Error('Email is required');
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || user.role !== 'driver') {
          throw new Error('No driver account found with this email. Please contact your coordinator.');
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          provider: user.provider,
          driverPhone: user.driverPhone,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        // Check auth intent from the callback URL
        // Default behavior: allow sign-in, create user if doesn't exist (sign-up flow)
        // The frontend will handle the sign-up vs sign-in distinction
        const existingUser = await db.user.findUnique({
          where: { email: user.email! },
        });

        if (!existingUser) {
          // Create new passenger user (sign-up)
          await db.user.create({
            data: {
              email: user.email!,
              name: user.name || null,
              image: user.image || null,
              role: 'passenger',
              provider: 'google',
            },
          });
        }
        return true;
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role || 'passenger';
        token.provider = (user as { provider?: string }).provider || 'google';
        token.dbId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { role?: string }).role = token.role as string;
        (session.user as { provider?: string }).provider = token.provider as string;
        (session.user as { id?: string }).id = token.dbId as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/',
    error: '/',
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  secret: process.env.NEXTAUTH_SECRET,
};
