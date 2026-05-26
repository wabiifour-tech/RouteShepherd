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
import { useEffect } from 'react';

export default function Home() {
  const { currentView, user, isAuthenticated, setUser, setCurrentView } = useAppStore();

  // On mount, check for saved auth in localStorage
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('rs_user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        // If user was on a protected view, restore it
        // Otherwise stay on landing
      }
    } catch {
      // ignore
    }

    // Also check for NextAuth session (from Google OAuth callback)
    fetch('/api/auth/session')
      .then((res) => res.json())
      .then((session) => {
        if (session?.user) {
          const role = (session.user as { role?: string }).role || 'passenger';
          const provider = (session.user as { provider?: string }).provider || 'google';
          const id = (session.user as { id?: string }).id || '';
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
          // Redirect to appropriate view based on role
          if (role === 'passenger') {
            setCurrentView('passenger');
          } else if (role === 'coordinator') {
            setCurrentView('coordinator');
          } else if (role === 'driver') {
            setCurrentView('driver');
          }
        }
      })
      .catch(() => {
        // ignore - session check is optional
      });
  }, []); // eslint-disable-line -- setUser, setCurrentView are stable

  // Route protection: redirect unauthenticated users to login pages
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (isAuthenticated) return;

    if (currentView === 'passenger') {
      setCurrentView('passenger-login');
    } else if (currentView === 'coordinator') {
      setCurrentView('coordinator-login');
    } else if (currentView === 'driver') {
      setCurrentView('driver-login');
    }
  }, [currentView, isAuthenticated, setCurrentView]);

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
