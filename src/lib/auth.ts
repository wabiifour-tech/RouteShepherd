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
        pin: { label: '6-Digit PIN', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.pin) {
          throw new Error('Email and PIN are required');
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || user.role !== 'driver') {
          throw new Error('No driver account found with this email. Please contact your coordinator.');
        }

        if (!user.pinHash) {
          throw new Error('No PIN set for this driver. Please contact your coordinator to set up your PIN.');
        }

        const isValid = await bcrypt.compare(credentials.pin, user.pinHash);
        if (!isValid) {
          throw new Error('Invalid PIN. Please try again.');
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
    CredentialsProvider({
      id: 'passenger',
      name: 'Passenger Login',
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

        if (!user || user.role !== 'passenger') {
          throw new Error('No passenger account found with this email.');
        }

        if (!user.password) {
          throw new Error('This account was created with Google. Please sign in with Google instead.');
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) {
          throw new Error('Invalid email or password.');
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
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        const existingUser = await db.user.findUnique({
          where: { email: user.email! },
        });

        if (!existingUser) {
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
