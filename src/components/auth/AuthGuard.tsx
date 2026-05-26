'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useAppStore } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldX, Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: ReactNode;
  allowedRoles: string[];
  fallbackView?: string;
}

export default function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const { user, isAuthenticated, setCurrentView } = useAppStore();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Check if we have a valid session from the server
    const verifySession = async () => {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();

        if (!data.authenticated || !data.user) {
          // No valid session - redirect to landing
          setCurrentView('landing');
          setChecking(false);
          return;
        }

        // Check if user role is allowed
        if (!allowedRoles.includes(data.user.role)) {
          setChecking(false);
          return;
        }

        setChecking(false);
      } catch {
        setCurrentView('landing');
        setChecking(false);
      }
    };

    verifySession();
  }, [allowedRoles, setCurrentView]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#1B5E20]" />
      </div>
    );
  }

  // Check client-side auth state
  if (!isAuthenticated || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="p-8 text-center space-y-4">
            <div className="flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <ShieldX className="h-8 w-8 text-red-600" />
              </div>
            </div>
            <h2 className="text-xl font-bold">Access Denied</h2>
            <p className="text-muted-foreground text-sm">
              You must be logged in to access this page.
            </p>
            <Button
              className="bg-[#1B5E20] text-white hover:bg-[#1B5E20]/90"
              onClick={() => setCurrentView('landing')}
            >
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!allowedRoles.includes(user.role)) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="p-8 text-center space-y-4">
            <div className="flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <ShieldX className="h-8 w-8 text-red-600" />
              </div>
            </div>
            <h2 className="text-xl font-bold">Unauthorized</h2>
            <p className="text-muted-foreground text-sm">
              You do not have permission to access this page. This area is restricted to {allowedRoles.join(', ')} accounts.
            </p>
            <Button
              className="bg-[#1B5E20] text-white hover:bg-[#1B5E20]/90"
              onClick={() => setCurrentView('landing')}
            >
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
