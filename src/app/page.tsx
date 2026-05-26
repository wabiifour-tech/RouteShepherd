'use client';

import { useAppStore } from '@/lib/store';
import NavBar from '@/components/NavBar';
import LandingView from '@/components/LandingView';
import PassengerPortal from '@/components/PassengerPortal';
import CoordinatorDashboard from '@/components/CoordinatorDashboard';
import DriverInterface from '@/components/DriverInterface';
import { AnimatePresence, motion } from 'framer-motion';

export default function Home() {
  const { currentView } = useAppStore();

  const renderView = () => {
    switch (currentView) {
      case 'landing':
        return <LandingView />;
      case 'passenger':
        return <PassengerPortal />;
      case 'coordinator':
        return <CoordinatorDashboard />;
      case 'driver':
        return <DriverInterface />;
      default:
        return <LandingView />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <NavBar />
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
