'use client';

import { useAppStore } from '@/lib/store';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Bus, Lock, Mail, ArrowLeft, Loader2, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const REMEMBER_KEY = 'rs_coordinator_remember';

export default function CoordinatorLoginPage() {
  const { setCurrentView, setUser } = useAppStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Load saved credentials on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.email) setEmail(data.email);
        if (data.password) setPassword(data.password);
        setRememberMe(true);
      }
    } catch {
      // ignore
    }
  }, []);

  // Auto-fill when email field is focused and remember me was checked
  const handleEmailFocus = () => {
    try {
      const saved = localStorage.getItem(REMEMBER_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.email && !email) setEmail(data.email);
        if (data.password && !password) setPassword(data.password);
      }
    } catch {
      // ignore
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      toast.error('Please enter both email and password');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/coordinator-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Save or clear remember me
      if (rememberMe) {
        localStorage.setItem(REMEMBER_KEY, JSON.stringify({ email, password }));
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }

      setUser({
        id: data.id,
        email: data.email,
        name: data.name,
        image: null,
        role: 'coordinator',
        phone: null,
        provider: 'credentials',
      });
      localStorage.setItem('rs_user', JSON.stringify({
        id: data.id,
        email: data.email,
        name: data.name,
        image: null,
        role: 'coordinator',
        phone: null,
        provider: 'credentials',
      }));
      toast.success('Welcome back, Coordinator!');
      setCurrentView('coordinator');
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
              <Shield className="h-6 w-6 text-[#F9A825]" />
            </div>
          </div>
          <h1 className="text-2xl font-bold">
            Coordinator <span className="text-[#1B5E20]">Login</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Access the fleet management dashboard
          </p>
        </div>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-[#1B5E20]" />
              Sign In
            </CardTitle>
            <CardDescription>Enter your coordinator credentials</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="coord-email">Email</Label>
              <Input
                id="coord-email"
                type="email"
                placeholder="coordinator@routeshepherd.ng"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={handleEmailFocus}
              />
            </div>
            <div>
              <Label htmlFor="coord-password">Password</Label>
              <Input
                id="coord-password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked === true)}
              />
              <Label htmlFor="remember" className="text-sm cursor-pointer">
                Remember Me
              </Label>
            </div>
            <Button
              className="w-full bg-[#1B5E20] text-white hover:bg-[#1B5E20]/90 h-12"
              onClick={handleLogin}
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Lock className="mr-2 h-4 w-4" />
              )}
              {submitting ? 'Signing In...' : 'Login'}
            </Button>

            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground text-center">
                Coordinators cannot sign up. If you need access, contact your system administrator.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
