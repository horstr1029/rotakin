'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Shield, LogIn, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await signIn('credentials', { email: email.trim(), password, redirect: false });
    setLoading(false);
    if (result?.error) { setError('Invalid email or password'); return; }
    router.replace('/');
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--rk-bg)' }}>
      <div className="w-full max-w-sm rounded-2xl p-8" style={{ background: 'var(--rk-surface)', border: '1px solid var(--rk-border)' }}>
        <div className="flex flex-col items-center mb-8">
          <div
            className="flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{ background: 'rgba(0,194,255,0.12)', border: '1px solid rgba(0,194,255,0.25)' }}
          >
            <Shield className="w-7 h-7" style={{ color: 'var(--rk-accent)' }} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--rk-accent)' }}>ROTAKIN</h1>
          <p className="text-xs mt-1" style={{ color: 'var(--rk-text3)' }}>CCTV Compliance Audit Platform</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="admin@rotakin.local"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPw ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                disabled={loading}
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded"
                style={{ color: 'var(--rk-text3)' }}
                onClick={() => setShowPw(v => !v)}
                tabIndex={-1}
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-center" style={{ color: 'var(--rk-red)' }}>{error}</p>
          )}

          <Button type="submit" disabled={loading} className="gap-2 mt-1">
            <LogIn className="w-4 h-4" />
            {loading ? 'Signing in…' : 'Sign In'}
          </Button>
        </form>

        <p className="text-center text-xs mt-6" style={{ color: 'var(--rk-text3)' }}>
          Private system — authorised users only
        </p>
      </div>
    </div>
  );
}
