'use client';

import { useAppStore } from '@/lib/store';
import NavBar from '@/components/NavBar';
import LandingView from '@/components/LandingView';
import PassengerPortal from '@/components/PassengerPortal';
import CoordinatorDashboard from '@/components/CoordinatorDashboard';
import DriverInterface from '@/components/DriverInterface';
import PassengerLoginPage from '@/components/auth/PassengerLoginPage';
import CoordinatorLoginPage from '@/components/auth/CoordinatorLoginPage';
import DriverLoginPage from '@/components/auth/DriverLoginPage';
import AuthGuard from '@/components/auth/AuthGuard';
import PWAInstallPrompt from '@/components/PWAInstallPrompt';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

export default function Home() {
  const { currentView, user, isAuthenticated, setUser, setCurrentView } = useAppStore();
  const { data: session, status } = useSession();
  const [initialized, setInitialized] = useState(false);

  // Initialize auth state from NextAuth session (server-side source of truth)
  useEffect(() => {
    if (status === 'loading') return; // Wait for session to load

    if (session?.user) {
      // NextAuth session exists - use it as the source of truth
      const role = (session.user as Record<string, unknown>).role as string || 'passenger';
      const provider = (session.user as Record<string, unknown>).provider as string || 'google';
      const id = (session.user as Record<string, unknown>).id as string || '';
      const pinChangeRequired = (session.user as Record<string, unknown>).pinChangeRequired as boolean || false;
      const userData = {
        id,
        email: session.user.email || '',
        name: session.user.name || null,
        image: session.user.image || null,
        role,
        phone: null,
        provider,
        pinChangeRequired,
      };
      setUser(userData);
      localStorage.setItem('rs_user', JSON.stringify(userData));

      // Only auto-redirect from landing page.
      // Do NOT auto-redirect from login pages - login components handle their own navigation
      // (e.g., driver login shows PIN change modal before redirecting to dashboard).
      // For drivers with pinChangeRequired, the DriverLoginPage handles showing the modal.
      if (currentView === 'landing') {
        if (role === 'passenger') setCurrentView('passenger');
        else if (role === 'coordinator') setCurrentView('coordinator');
        else if (role === 'driver' && !pinChangeRequired) setCurrentView('driver');
      }
    } else if (!isAuthenticated) {
      // No NextAuth session and no local state - try localStorage
      try {
        const savedUser = localStorage.getItem('rs_user');
        if (savedUser) {
          const parsed = JSON.parse(savedUser);
          setUser(parsed);
          // Only redirect from landing page
          if (currentView === 'landing') {
            if (parsed.role === 'passenger') setCurrentView('passenger');
            else if (parsed.role === 'coordinator') setCurrentView('coordinator');
            else if (parsed.role === 'driver' && !parsed.pinChangeRequired) setCurrentView('driver');
          }
        }
      } catch {
        // ignore
      }
    }

    setInitialized(true);
  }, [session, status]); // eslint-disable-line -- intentional: only re-run when session changes

  // Route protection: redirect unauthenticated users to login pages
  useEffect(() => {
    if (!initialized) return; // Wait for auth initialization
    if (isAuthenticated) return;

    if (currentView === 'passenger') {
      setCurrentView('passenger-login');
    } else if (currentView === 'coordinator') {
      setCurrentView('coordinator-login');
    } else if (currentView === 'driver') {
      setCurrentView('driver-login');
    }
  }, [currentView, isAuthenticated, initialized, setCurrentView]);

  const renderView = () => {
    switch (currentView) {
      case 'landing':
        return <LandingView />;
      case 'passenger-login':
        return <PassengerLoginPage />;
      case 'coordinator-login':
        return <CoordinatorLoginPage />;
      case 'driver-login':
        return <DriverLoginPage />;
      case 'passenger':
        return (
          <AuthGuard allowedRoles={['passenger']}>
            <PassengerPortal />
          </AuthGuard>
        );
      case 'coordinator':
        return (
          <AuthGuard allowedRoles={['coordinator']}>
            <CoordinatorDashboard />
          </AuthGuard>
        );
      case 'driver':
        return (
          <AuthGuard allowedRoles={['driver']}>
            <DriverInterface />
          </AuthGuard>
        );
      default:
        return <LandingView />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hide NavBar on login pages */}
      {!['passenger-login', 'coordinator-login', 'driver-login'].includes(currentView) && <NavBar />}
      <main className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
          >
            {renderView()}
          </motion.div>
        </AnimatePresence>
      </main>
      <PWAInstallPrompt />
    </div>
  );
}
