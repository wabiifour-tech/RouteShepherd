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
      const userData = {
        id,
        email: session.user.email || '',
        name: session.user.name || null,
        image: session.user.image || null,
        role,
        phone: null,
        provider,
      };
      setUser(userData);
      localStorage.setItem('rs_user', JSON.stringify(userData));

      // Only redirect if we're still on the landing page
      if (currentView === 'landing' || currentView === 'passenger-login' || currentView === 'coordinator-login' || currentView === 'driver-login') {
        if (role === 'passenger') setCurrentView('passenger');
        else if (role === 'coordinator') setCurrentView('coordinator');
        else if (role === 'driver') setCurrentView('driver');
      }
    } else if (!isAuthenticated) {
      // No NextAuth session and no local state - try localStorage
      try {
        const savedUser = localStorage.getItem('rs_user');
        if (savedUser) {
          const parsed = JSON.parse(savedUser);
          setUser(parsed);
          // Redirect to appropriate view
          if (parsed.role === 'passenger') setCurrentView('passenger');
          else if (parsed.role === 'coordinator') setCurrentView('coordinator');
          else if (parsed.role === 'driver') setCurrentView('driver');
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
        if (!isAuthenticated) return <PassengerLoginPage />;
        return <PassengerPortal />;
      case 'coordinator':
        if (!isAuthenticated || user?.role !== 'coordinator') return <CoordinatorLoginPage />;
        return <CoordinatorDashboard />;
      case 'driver':
        if (!isAuthenticated || user?.role !== 'driver') return <DriverLoginPage />;
        return <DriverInterface />;
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
    </div>
  );
}
