'use client';

import { useAppStore } from '@/lib/store';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Bus, Lock, Mail, ArrowLeft, Loader2, MapPin, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { signIn } from 'next-auth/react';

export default function DriverLoginPage() {
  const { setCurrentView, setUser } = useAppStore();
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async () => {
    if (!email) {
      toast.error('Please enter your email');
      return;
    }
    if (!pin || pin.length !== 6) {
      toast.error('Please enter your 6-digit PIN');
      return;
    }
    setSubmitting(true);
    try {
      // First validate credentials via our API
      const res = await fetch('/api/auth/driver-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Establish NextAuth session
      const result = await signIn('driver', {
        email,
        pin,
        redirect: false,
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      setUser({
        id: data.id,
        email: data.email,
        name: data.name,
        image: null,
        role: 'driver',
        phone: null,
        provider: 'credentials',
        driverPhone: data.driverPhone,
        assignedBuses: data.assignedBuses,
      });
      localStorage.setItem('rs_user', JSON.stringify({
        id: data.id,
        email: data.email,
        name: data.name,
        image: null,
        role: 'driver',
        phone: null,
        provider: 'credentials',
        driverPhone: data.driverPhone,
        assignedBuses: data.assignedBuses,
      }));
      toast.success('Welcome, Driver!');
      setCurrentView('driver');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePinChange = (value: string) => {
    // Only allow digits, max 6
    const digits = value.replace(/\D/g, '').slice(0, 6);
    setPin(digits);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
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
            <div>
              <Label htmlFor="driver-email">Email Address</Label>
              <Input
                id="driver-email"
                type="email"
                placeholder="driver@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                onChange={(e) => handlePinChange(e.target.value)}
                maxLength={6}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>

            <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 p-3">
              <div className="flex gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div className="text-xs text-amber-700 dark:text-amber-400">
                  <p>Your coordinator assigned you an email and a 6-digit PIN when creating your account. Enter both to sign in.</p>
                  <p className="mt-1">If you don&apos;t know your PIN, ask your coordinator to reset it for you.</p>
                </div>
              </div>
            </div>

            <Button
              className="w-full bg-[#1B5E20] text-white hover:bg-[#1B5E20]/90 h-12"
              onClick={handleLogin}
              disabled={submitting}
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
