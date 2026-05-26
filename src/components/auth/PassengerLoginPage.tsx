'use client';

import { useAppStore } from '@/lib/store';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Bus, Users, Mail, Lock, ArrowLeft, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { signIn } from 'next-auth/react';

export default function PassengerLoginPage() {
  const { setCurrentView, setUser } = useAppStore();
  const [mode, setMode] = useState<'choose' | 'signup' | 'signin'>('choose');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSignUp = async () => {
    if (!email || !name || !password) {
      toast.error('Please fill in all required fields (name, email, password)');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, phone, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Sign up failed');
      }

      // Establish NextAuth session with the new credentials
      const result = await signIn('passenger', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        // Session creation failed but account was created
        console.warn('Session creation failed after signup:', result.error);
      }

      setUser({
        id: data.id,
        email: data.email,
        name: data.name,
        image: null,
        role: 'passenger',
        phone: phone || null,
        provider: 'credentials',
      });
      localStorage.setItem('rs_user', JSON.stringify({
        id: data.id,
        email: data.email,
        name: data.name,
        image: null,
        role: 'passenger',
        phone: phone || null,
        provider: 'credentials',
      }));
      toast.success('Account created successfully! Welcome aboard.');
      setCurrentView('passenger');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sign up failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignIn = async () => {
    if (!email || !password) {
      toast.error('Please enter both email and password');
      return;
    }
    setSubmitting(true);
    try {
      // Sign in via NextAuth credentials provider
      const result = await signIn('passenger', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        throw new Error(result.error === 'CredentialsSignin'
          ? 'Invalid email or password. If you signed up with Google, please use Google sign-in.'
          : result.error);
      }

      // Get user data from NextAuth session
      const sessionRes = await fetch('/api/auth/session');
      const session = await sessionRes.json();

      if (session?.user) {
        const userData = {
          id: (session.user as Record<string, unknown>).id as string || '',
          email: session.user.email || '',
          name: session.user.name || null,
          image: session.user.image || null,
          role: (session.user as Record<string, unknown>).role as string || 'passenger',
          phone: null,
          provider: (session.user as Record<string, unknown>).provider as string || 'credentials',
        };
        setUser(userData);
        localStorage.setItem('rs_user', JSON.stringify(userData));
      }

      toast.success('Welcome back!');
      setCurrentView('passenger');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignUp = () => {
    document.cookie = 'auth_intent=signup; path=/; max-age=300';
    const callbackUrl = encodeURIComponent(window.location.origin);
    window.location.href = `/api/auth/signin/google?callbackUrl=${callbackUrl}`;
  };

  const handleGoogleSignIn = () => {
    document.cookie = 'auth_intent=signin; path=/; max-age=300';
    const callbackUrl = encodeURIComponent(window.location.origin);
    window.location.href = `/api/auth/signin/google?callbackUrl=${callbackUrl}`;
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
              <Bus className="h-6 w-6 text-[#F9A825]" />
            </div>
          </div>
          <h1 className="text-2xl font-bold">
            Passenger <span className="text-[#1B5E20]">Portal</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Sign in to pre-register your trip and track buses
          </p>
        </div>

        {mode === 'choose' && (
          <Card className="shadow-xl">
            <CardContent className="p-6 space-y-4">
              <Button
                className="w-full bg-white text-gray-800 hover:bg-gray-100 border border-gray-300 h-12"
                onClick={handleGoogleSignUp}
              >
                <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Sign Up with Google
              </Button>

              <Button
                className="w-full bg-white text-gray-800 hover:bg-gray-100 border border-gray-300 h-12"
                onClick={handleGoogleSignIn}
              >
                <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Sign In with Google
              </Button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">or continue with email</span>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full h-12 border-[#1B5E20] text-[#1B5E20] hover:bg-[#1B5E20] hover:text-white"
                onClick={() => setMode('signup')}
              >
                <Mail className="mr-2 h-4 w-4" />
                Sign Up with Email
              </Button>

              <Button
                variant="outline"
                className="w-full h-12"
                onClick={() => setMode('signin')}
              >
                <Lock className="mr-2 h-4 w-4" />
                Sign In with Email
              </Button>

              <div className="mt-4 rounded-lg bg-muted/50 p-3">
                <div className="flex gap-2">
                  <AlertCircle className="h-4 w-4 text-[#F9A825] mt-0.5 shrink-0" />
                  <div className="text-xs text-muted-foreground">
                    <p className="font-medium text-foreground mb-1">Sign Up vs Sign In:</p>
                    <p><strong>Sign Up</strong> — Create a new account with email and password. First time here? This is for you.</p>
                    <p className="mt-1"><strong>Sign In</strong> — Already have an account? Enter your email and password to log back in.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {mode === 'signup' && (
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-[#1B5E20]" />
                Create Account
              </CardTitle>
              <CardDescription>Sign up with email and password</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="signup-name">Full Name *</Label>
                <Input
                  id="signup-name"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="signup-email">Email *</Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="signup-phone">Phone (Optional)</Label>
                <Input
                  id="signup-phone"
                  placeholder="+234-XXX-XXX-XXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="signup-password">Password *</Label>
                <Input
                  id="signup-password"
                  type="password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="signup-confirm-password">Confirm Password *</Label>
                <Input
                  id="signup-confirm-password"
                  type="password"
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSignUp()}
                />
              </div>
              <Button
                className="w-full bg-[#1B5E20] text-white hover:bg-[#1B5E20]/90 h-12"
                onClick={handleSignUp}
                disabled={submitting}
              >
                {submitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Users className="mr-2 h-4 w-4" />
                )}
                {submitting ? 'Creating Account...' : 'Create Account'}
              </Button>
              <button
                onClick={() => setMode('choose')}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors text-center"
              >
                ← Back to sign in options
              </button>
            </CardContent>
          </Card>
        )}

        {mode === 'signin' && (
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-[#1B5E20]" />
                Sign In
              </CardTitle>
              <CardDescription>Enter your email and password</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="signin-email">Email *</Label>
                <Input
                  id="signin-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="signin-password">Password *</Label>
                <Input
                  id="signin-password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSignIn()}
                />
              </div>
              <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 p-3">
                <div className="flex gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    If you signed up with Google, please use the Google sign-in button above. Email sign-in requires a password set during sign-up.
                  </p>
                </div>
              </div>
              <Button
                className="w-full bg-[#1B5E20] text-white hover:bg-[#1B5E20]/90 h-12"
                onClick={handleSignIn}
                disabled={submitting}
              >
                {submitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Lock className="mr-2 h-4 w-4" />
                )}
                {submitting ? 'Signing In...' : 'Sign In'}
              </Button>
              <button
                onClick={() => setMode('choose')}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors text-center"
              >
                ← Back to sign in options
              </button>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </div>
  );
}
