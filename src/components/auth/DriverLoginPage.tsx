'use client';

import { useAppStore } from '@/lib/store';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Bus, Mail, ArrowLeft, Loader2, MapPin, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function DriverLoginPage() {
  const { setCurrentView, setUser } = useAppStore();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async () => {
    if (!email) {
      toast.error('Please enter your email');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/driver-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      setUser({
        id: data.id,
        email: data.email,
        name: data.name,
        image: null,
        role: 'driver',
        phone: null,
        provider: 'email-only',
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
        provider: 'email-only',
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
            Sign in with your email to manage your bus
          </p>
        </div>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-[#1B5E20]" />
              Sign In
            </CardTitle>
            <CardDescription>Enter the email your coordinator assigned to you</CardDescription>
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
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>

            <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 p-3">
              <div className="flex gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div className="text-xs text-amber-700 dark:text-amber-400">
                  <p>No password needed. Simply enter the email your coordinator used when adding you to the system.</p>
                  <p className="mt-1">If your email is not found, ask your coordinator to add you first.</p>
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
