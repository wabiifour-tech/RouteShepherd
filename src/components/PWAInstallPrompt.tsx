'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Download, Smartphone, WifiOff, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [installOutcome, setInstallOutcome] = useState<'accepted' | 'dismissed' | null>(null);

  // Check if app is already installed
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if running as installed PWA
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Check if user previously dismissed the prompt
    const dismissed = localStorage.getItem('rs_pwa_dismissed');
    if (dismissed) {
      const dismissedAt = new Date(dismissed);
      const daysSinceDismissed = (Date.now() - dismissedAt.getTime()) / (1000 * 60 * 60 * 24);
      // Show again after 7 days
      if (daysSinceDismissed < 7) return;
    }

    // Show prompt after a short delay (let the user see the app first)
    const timer = setTimeout(() => {
      if (deferredPrompt) {
        setShowPrompt(true);
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [deferredPrompt]);

  // Listen for the beforeinstallprompt event
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Listen for online/offline status
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    setIsOffline(!navigator.onLine);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Listen for app installed event
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handler = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setInstallOutcome('accepted');
    };

    window.addEventListener('appinstalled', handler);
    return () => window.removeEventListener('appinstalled', handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      setInstallOutcome(outcome);
      setDeferredPrompt(null);

      if (outcome === 'dismissed') {
        localStorage.setItem('rs_pwa_dismissed', new Date().toISOString());
      }
    } catch (error) {
      console.error('[PWA] Install prompt failed:', error);
    }
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setShowPrompt(false);
    localStorage.setItem('rs_pwa_dismissed', new Date().toISOString());
  }, []);

  // Don't render if already installed
  if (isInstalled && !isOffline) return null;

  return (
    <>
      {/* Offline indicator banner */}
      <AnimatePresence>
        {isOffline && (
          <motion.div
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-amber-950 px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2"
          >
            <WifiOff className="h-4 w-4" />
            You&apos;re offline. Some features may be limited.
            <button
              onClick={() => setIsOffline(false)}
              className="ml-2 text-amber-950/60 hover:text-amber-950"
            >
              <X className="h-3 w-3" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Install prompt */}
      <AnimatePresence>
        {showPrompt && !isInstalled && deferredPrompt && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-4 left-4 right-4 z-[90] sm:left-auto sm:right-4 sm:w-96"
          >
            <Card className="border-2 border-[#1B5E20]/20 shadow-2xl bg-white dark:bg-gray-900">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-[#1B5E20] to-[#2E7D32] flex items-center justify-center shadow-lg">
                    <Smartphone className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-heading font-bold text-base text-foreground">
                      Install RouteShepherd
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                      Add RouteShepherd to your home screen for quick access, offline support, and real-time bus tracking.
                    </p>
                    <div className="flex items-center gap-3 mt-3">
                      <Button
                        onClick={handleInstall}
                        size="sm"
                        className="bg-[#1B5E20] hover:bg-[#1B5E20]/90 text-white font-semibold"
                      >
                        <Download className="mr-1.5 h-4 w-4" />
                        Install App
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDismiss}
                        className="text-muted-foreground"
                      >
                        Not now
                      </Button>
                    </div>
                  </div>
                  <button
                    onClick={handleDismiss}
                    className="flex-shrink-0 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success message after install */}
      <AnimatePresence>
        {installOutcome === 'accepted' && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-4 left-4 right-4 z-[90] sm:left-auto sm:right-4 sm:w-80"
          >
            <Card className="border-2 border-green-200 shadow-2xl bg-green-50 dark:bg-green-950/30 dark:border-green-800">
              <CardContent className="p-4 flex items-center gap-3">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-green-800 dark:text-green-200 text-sm">
                    RouteShepherd Installed!
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">
                    Access it from your home screen anytime.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
