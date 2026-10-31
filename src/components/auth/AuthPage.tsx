import React, { useState } from 'react';
import { authService, AuthUser } from '../../lib/authService';
import { store } from '../../lib/storage';
import {
  Lock,
  Mail,
  User as UserIcon,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Leaf,
  WifiOff,
} from 'lucide-react';

interface AuthPageProps {
  initialMode?: 'signin' | 'signup';
  onAuthSuccess: (user: AuthUser) => void;
  onContinueOffline: () => void;
  onBackToLanding?: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  initialMode = 'signin',
  onAuthSuccess,
  onContinueOffline,
  onBackToLanding,
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Password Strength Meter
  const getPasswordStrength = (pass: string): { score: number; label: string; color: string } => {
    if (!pass) return { score: 0, label: '', color: 'bg-slate-200' };
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 1) return { score: 25, label: 'Weak', color: 'bg-[#E06D53]' };
    if (score === 2) return { score: 50, label: 'Fair', color: 'bg-[#D4952B]' };
    if (score === 3) return { score: 75, label: 'Good', color: 'bg-[#3B82F6]' };
    return { score: 100, label: 'Strong', color: 'bg-[#2E8B57]' };
  };

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      if (mode === 'signup') {
        if (!displayName.trim()) {
          setErrorMessage('Please enter your full name or preferred display name.');
          setIsLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setErrorMessage('Passwords do not match. Please verify both fields.');
          setIsLoading(false);
          return;
        }

        const res = await authService.register({
          email,
          password,
          display_name: displayName.trim(),
        });

        if (!res.success || !res.user) {
          setErrorMessage(res.error || 'Failed to create account. Please try again.');
          setIsLoading(false);
          return;
        }

        store.updateUser({ display_name: res.user.display_name, email: res.user.email });
        onAuthSuccess(res.user);
      } else {
        // Sign In mode
        const res = await authService.login({
          email,
          password,
        });

        if (!res.success || !res.user) {
          setErrorMessage(res.error || 'Invalid email or password.');
          setIsLoading(false);
          return;
        }

        store.updateUser({ display_name: res.user.display_name, email: res.user.email });
        onAuthSuccess(res.user);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication encountered an unexpected error.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#181D26] flex flex-col justify-between selection:bg-[#D4952B]/20 selection:text-[#8C5D17]">
      {/* Top Navbar */}
      <header className="w-full px-6 py-4 flex items-center justify-between border-b border-[#EDE8E0] bg-white/60 backdrop-blur-md">
        <div
          className="flex items-center gap-2.5 cursor-pointer"
          onClick={onBackToLanding}
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#D4952B] to-[#E5AB4B] flex items-center justify-center text-white shadow-sm shadow-[#D4952B]/20">
            <Leaf className="w-4 h-4 fill-white" />
          </div>
          <div>
            <span className="font-black text-base tracking-tight text-[#181D26]">PAISA</span>
            <span className="ml-1.5 text-[11px] text-[#7F899F] font-semibold hidden sm:inline">
              Daily Money Reality Check
            </span>
          </div>
        </div>

        {onBackToLanding && (
          <button
            onClick={onBackToLanding}
            className="text-xs font-bold text-[#5E687D] hover:text-[#181D26] transition-colors"
          >
            ← Back to Home
          </button>
        )}
      </header>

      {/* Main Form Centerpiece */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md bg-white border border-[#EDE8E0] rounded-3xl p-6 sm:p-8 shadow-card space-y-6">
          {/* Header Title & Subtitle */}
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-black text-[#181D26] tracking-tight">
              {mode === 'signup' ? 'Create your PAISA account' : 'Welcome back to PAISA'}
            </h1>
            <p className="text-xs text-[#7F899F] font-medium">
              {mode === 'signup'
                ? 'Start fresh with zero imaginary data and real money intelligence.'
                : 'Sign in to access your ledger, offline cache, and sync state.'}
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex rounded-2xl bg-[#FAF8F5] p-1 border border-[#EDE8E0]">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setErrorMessage(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                mode === 'signin'
                  ? 'bg-white text-[#181D26] shadow-xs'
                  : 'text-[#7F899F] hover:text-[#181D26]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setErrorMessage(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                mode === 'signup'
                  ? 'bg-white text-[#181D26] shadow-xs'
                  : 'text-[#7F899F] hover:text-[#181D26]'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Error Message Alert */}
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-600 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#3D4658]">
                  Full Name / Display Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-[#7F899F] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="e.g. Atharva Naik"
                    className="input-field pl-9.5 text-xs rounded-xl"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#3D4658]">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#7F899F] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="input-field pl-9.5 text-xs rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#3D4658]">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#7F899F] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={mode === 'signup' ? 'Min. 8 characters' : 'Enter your password'}
                  className="input-field pl-9.5 pr-10 text-xs rounded-xl"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7F899F] hover:text-[#181D26]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password Strength Meter for Sign Up */}
              {mode === 'signup' && password.length > 0 && (
                <div className="pt-1 space-y-1">
                  <div className="h-1.5 w-full bg-[#FAF8F5] rounded-full overflow-hidden border border-[#EDE8E0]">
                    <div
                      className={`h-full transition-all duration-300 ${strength.color}`}
                      style={{ width: `${strength.score}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-[#7F899F]">
                    <span>Requires 8+ chars, uppercase, number, symbol</span>
                    <span className="font-bold">{strength.label}</span>
                  </div>
                </div>
              )}
            </div>

            {mode === 'signup' && (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#3D4658]">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#7F899F] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="input-field pl-9.5 text-xs rounded-xl"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-2xl bg-[#181D26] text-white text-xs font-bold hover:bg-[#2A3140] transition-all flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{mode === 'signup' ? 'Creating account...' : 'Signing in...'}</span>
                </>
              ) : (
                <>
                  <span>{mode === 'signup' ? 'Create Account & Begin' : 'Sign In to PAISA'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-[#EDE8E0] w-full" />
            <span className="bg-white px-3 text-[10px] uppercase tracking-wider text-[#7F899F] font-bold absolute">
              OR
            </span>
          </div>

          {/* Offline Guest Option */}
          <button
            type="button"
            onClick={onContinueOffline}
            className="w-full py-2.5 rounded-2xl bg-[#FAF8F5] border border-[#EDE8E0] hover:border-[#D4952B] text-xs font-bold text-[#3D4658] hover:text-[#181D26] transition-all flex items-center justify-center gap-2"
          >
            <WifiOff className="w-3.5 h-3.5 text-[#D4952B]" />
            <span>Continue Offline as Guest</span>
          </button>

          {/* Privacy Footnote */}
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#7F899F] pt-2 text-center">
            <ShieldCheck className="w-3.5 h-3.5 text-[#2E8B57]" />
            <span>Bank-grade local encryption. Your financial data is isolated.</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full text-center py-4 text-xs text-[#7F899F] border-t border-[#EDE8E0]">
        PAISA • Daily Money Reality Check • Built for India 🇮🇳
      </footer>
    </div>
  );
};
