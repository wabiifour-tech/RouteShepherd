'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface PinChangeModalProps {
  email: string;
  onPinChanged: () => void;
  onSkip?: () => void;
}

export default function PinChangeModal({ email, onPinChanged, onSkip }: PinChangeModalProps) {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleChangePin = async () => {
    setError('');

    if (!currentPin || currentPin.length !== 6) {
      setError('Please enter your current 6-digit PIN');
      return;
    }
    if (!newPin || newPin.length !== 6) {
      setError('Please enter a new 6-digit PIN');
      return;
    }
    if (newPin === currentPin) {
      setError('New PIN must be different from your current PIN');
      return;
    }
    if (newPin !== confirmPin) {
      setError('New PIN and confirmation PIN do not match');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/change-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPin, newPin, confirmPin }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'PIN change failed');
      }

      toast.success('PIN changed successfully!');
      onPinChanged();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'PIN change failed';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePinInput = (value: string): string => {
    return value.replace(/\D/g, '').slice(0, 6);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-2 border-[#F9A825]">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            </div>
          </div>
          <CardTitle className="text-xl">PIN Change Required</CardTitle>
          <CardDescription>
            For your security, you must change your temporary PIN before continuing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 p-3">
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Your coordinator assigned you a temporary PIN. Please create a new 6-digit PIN that only you know.
            </p>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-3 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          <div>
            <Label htmlFor="current-pin">Current PIN</Label>
            <Input
              id="current-pin"
              type="password"
              inputMode="numeric"
              placeholder="Enter your current 6-digit PIN"
              value={currentPin}
              onChange={(e) => { setCurrentPin(handlePinInput(e.target.value)); setError(''); }}
              maxLength={6}
              disabled={submitting}
            />
          </div>

          <div>
            <Label htmlFor="new-pin">New PIN</Label>
            <Input
              id="new-pin"
              type="password"
              inputMode="numeric"
              placeholder="Enter a new 6-digit PIN"
              value={newPin}
              onChange={(e) => { setNewPin(handlePinInput(e.target.value)); setError(''); }}
              maxLength={6}
              disabled={submitting}
            />
          </div>

          <div>
            <Label htmlFor="confirm-pin">Confirm New PIN</Label>
            <Input
              id="confirm-pin"
              type="password"
              inputMode="numeric"
              placeholder="Re-enter your new PIN"
              value={confirmPin}
              onChange={(e) => { setConfirmPin(handlePinInput(e.target.value)); setError(''); }}
              maxLength={6}
              onKeyDown={(e) => { if (e.key === 'Enter' && !submitting) handleChangePin(); }}
              disabled={submitting}
            />
          </div>

          <Button
            className="w-full bg-[#1B5E20] text-white hover:bg-[#1B5E20]/90 h-12"
            onClick={handleChangePin}
            disabled={submitting}
            type="button"
          >
            {submitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="mr-2 h-4 w-4" />
            )}
            {submitting ? 'Changing PIN...' : 'Change PIN & Continue'}
          </Button>

          {onSkip && (
            <button
              onClick={onSkip}
              className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors text-center"
              type="button"
            >
              Skip for now (you will be prompted again)
            </button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
