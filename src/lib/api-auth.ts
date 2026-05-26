import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export interface AuthUser {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  role: string;
  provider?: string;
}

/**
 * Requires a valid NextAuth session. Returns the user or null.
 */
export async function requireAuth(): Promise<AuthUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return null;
  }
  const user = session.user as Record<string, unknown>;
  return {
    id: (user.id as string) || '',
    email: (user.email as string) || '',
    name: user.name as string | null,
    image: user.image as string | null,
    role: (user.role as string) || 'passenger',
    provider: (user.provider as string) || 'google',
  };
}

/**
 * Requires a user with a specific role. Returns the user or null.
 */
export async function requireRole(role: string): Promise<AuthUser | null> {
  const user = await requireAuth();
  if (!user || user.role !== role) {
    return null;
  }
  return user;
}

/**
 * Requires the user to be a coordinator. Returns the user or null.
 */
export async function requireCoordinator(): Promise<AuthUser | null> {
  return requireRole('coordinator');
}

/**
 * Requires the user to be a driver. Returns the user or null.
 */
export async function requireDriver(): Promise<AuthUser | null> {
  return requireRole('driver');
}

/**
 * Requires the user to be authenticated with one of the allowed roles.
 */
export async function requireAnyRole(roles: string[]): Promise<AuthUser | null> {
  const user = await requireAuth();
  if (!user || !roles.includes(user.role)) {
    return null;
  }
  return user;
}
