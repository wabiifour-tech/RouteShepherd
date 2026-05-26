'use client';

import { useAppStore } from '@/lib/store';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Bus, Lock, ArrowLeft, Loader2, MapPin, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { signIn } from 'next-auth/react';
import PinChangeModal from '@/components/auth/PinChangeModal';

export default function DriverLoginPage() {
  const { setCurrentView, setUser } = useAppStore();
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showPinChange, setShowPinChange] = useState(false);

  const handleLogin = async () => {
    setError('');

    if (!email) {
      setError('Please enter your email');
      toast.error('Please enter your email');
      return;
    }
    if (!pin || pin.length !== 6) {
      setError('Please enter your 6-digit PIN');
      toast.error('Please enter your 6-digit PIN');
      return;
    }

    setSubmitting(true);
    try {
      // Use NextAuth credentials provider directly for driver
      const result = await signIn('driver', {
        email,
        pin,
        redirect: false,
      });

      if (result?.error) {
        const errorMsg = result.error === 'CredentialsSignin'
          ? 'Invalid email or PIN. Please check your credentials and try again.'
          : result.error;
        setError(errorMsg);
        toast.error(errorMsg);
        return;
      }

      // Get full user data from /api/auth/me
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let userData: any = null;
      try {
        const meRes = await fetch('/api/auth/me');
        const meData = await meRes.json();
        if (meData.authenticated && meData.user) {
          userData = meData.user;
        }
      } catch {
        // Fallback
        userData = {
          id: '',
          email,
          name: 'Driver',
          role: 'driver',
          provider: 'credentials',
        };
      }

      const userToSet = {
        id: userData?.id || '',
        email: userData?.email || email,
        name: userData?.name || null,
        image: userData?.image || null,
        role: 'driver' as const,
        phone: null,
        provider: 'credentials',
        driverPhone: userData?.driverPhone || null,
        assignedBuses: userData?.assignedBuses || [],
      };
      setUser(userToSet);
      localStorage.setItem('rs_user', JSON.stringify(userToSet));

      toast.success('Welcome, Driver!');

      // Check if PIN change is required
      const pinChangeRequired = userData?.pinChangeRequired !== false;
      if (pinChangeRequired) {
        setShowPinChange(true);
      } else {
        setCurrentView('driver');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Login failed. Please try again.';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePinChanged = () => {
    setShowPinChange(false);
    setCurrentView('driver');
  };

  const handlePinChangeSkip = () => {
    setShowPinChange(false);
    setCurrentView('driver');
  };

  const handlePinChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 6);
    setPin(digits);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {showPinChange && (
        <PinChangeModal
          email={email}
          onPinChanged={handlePinChanged}
          onSkip={handlePinChangeSkip}
        />
      )}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="mb-6 text-center">
          <button
            onClick={() => setCurrentView('landing')}
            className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </button>
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1B5E20]">
              <MapPin className="h-6 w-6 text-[#F9A825]" />
            </div>
          </div>
          <h1 className="text-2xl font-bold">
            Driver <span className="text-[#1B5E20]">Login</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Sign in with your email and 6-digit PIN
          </p>
        </div>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-[#1B5E20]" />
              Sign In
            </CardTitle>
            <CardDescription>Enter the email and PIN assigned by your coordinator</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-3 border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              </div>
            )}
            <div>
              <Label htmlFor="driver-email">Email Address</Label>
              <Input
                id="driver-email"
                type="email"
                placeholder="driver@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                disabled={submitting}
              />
            </div>
            <div>
              <Label htmlFor="driver-pin">6-Digit PIN</Label>
              <Input
                id="driver-pin"
                type="password"
                inputMode="numeric"
                placeholder="Enter your 6-digit PIN"
                value={pin}
                onChange={(e) => { handlePinChange(e.target.value); setError(''); }}
                maxLength={6}
                onKeyDown={(e) => { if (e.key === 'Enter' && !submitting) handleLogin(); }}
                disabled={submitting}
              />
            </div>

            <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 p-3">
              <div className="flex gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div className="text-xs text-amber-700 dark:text-amber-400">
                  <p>Your coordinator assigned you an email and a 6-digit PIN when creating your account. You will be required to change your PIN on first login.</p>
                  <p className="mt-1">If you don&apos;t know your PIN, ask your coordinator to reset it for you.</p>
                </div>
              </div>
            </div>

            <Button
              className="w-full bg-[#1B5E20] text-white hover:bg-[#1B5E20]/90 h-12"
              onClick={handleLogin}
              disabled={submitting}
              type="button"
            >
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Bus className="mr-2 h-4 w-4" />
              )}
              {submitting ? 'Signing In...' : 'Sign In'}
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
