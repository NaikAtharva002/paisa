import React, { useState, useEffect } from 'react';
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
  AlertCircle,
  Loader2,
  CheckCircle2,
  Leaf,
  WifiOff,
  Phone,
  KeyRound,
  RotateCcw,
} from 'lucide-react';

interface AuthPageProps {
  initialMode?: 'signin' | 'signup';
  onAuthSuccess: (user: AuthUser) => void;
  onContinueOffline: () => void;
  onBackToLanding?: () => void;
}

type AuthMethod = 'phone' | 'email';

export const AuthPage: React.FC<AuthPageProps> = ({
  initialMode = 'signin',
  onAuthSuccess,
  onContinueOffline,
  onBackToLanding,
}) => {
  const [method, setMethod] = useState<AuthMethod>('phone');
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  
  // Email fields
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Phone OTP fields
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [formattedPhone, setFormattedPhone] = useState('');
  const [testOtp, setTestOtp] = useState<string | null>(null);
  const [resendCountdown, setResendCountdown] = useState(0);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setInterval(() => {
      setResendCountdown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCountdown]);

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

  // 1. Google OAuth Sign In
  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setInfoMessage(null);
    setIsGoogleLoading(true);

    try {
      const res = await authService.signInWithGoogle();
      if (!res.success) {
        setErrorMessage(res.error || 'Google Sign-In failed. Please try again.');
        setIsGoogleLoading(false);
        return;
      }

      if (res.url) {
        // Redirect to Google OAuth URL
        window.location.href = res.url;
        return;
      }

      if (res.user) {
        store.updateUser({
          display_name: res.user.display_name,
          email: res.user.email,
        });
        onAuthSuccess(res.user);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to authenticate with Google.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // 2. Phone OTP: Send
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);

    const clean = phoneNumber.replace(/\D/g, '');
    if (clean.length < 10) {
      setErrorMessage('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await authService.sendPhoneOtp(phoneNumber);
      if (!res.success || !res.formattedPhone) {
        setErrorMessage(res.error || 'Failed to send OTP. Please check the number.');
        setIsLoading(false);
        return;
      }

      setFormattedPhone(res.formattedPhone);
      setOtpSent(true);
      setTestOtp(res.testOtp || '123456');
      setResendCountdown(30);
      setInfoMessage(`6-digit verification code sent to ${res.formattedPhone}`);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error sending OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Phone OTP: Verify
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);

    if (!otpCode.trim() || otpCode.trim().length < 6) {
      setErrorMessage('Please enter the 6-digit OTP code.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await authService.verifyPhoneOtp(formattedPhone || phoneNumber, otpCode);
      if (!res.success || !res.user) {
        setErrorMessage(res.error || 'Invalid OTP code. Please retry.');
        setIsLoading(false);
        return;
      }

      store.updateUser({
        display_name: res.user.display_name,
        email: res.user.email || `${res.user.phone}@phone.paisa`,
      });
      onAuthSuccess(res.user);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error verifying OTP code.');
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Email & Password: Sign In / Sign Up
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);
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
        <div className="w-full max-w-md bg-white border border-[#EDE8E0] rounded-3xl p-6 sm:p-8 shadow-card space-y-5">
          {/* Header Title & Subtitle */}
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-black text-[#181D26] tracking-tight">
              Welcome to PAISA
            </h1>
            <p className="text-xs text-[#7F899F] font-medium">
              Start fresh with real transaction data and ₹0 clean state.
            </p>
          </div>

          {/* Prominent Google Sign-In Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading || isLoading}
            className="w-full py-3 px-4 rounded-2xl border border-[#EDE8E0] bg-white hover:bg-slate-50 text-[#181D26] text-xs font-bold transition-all flex items-center justify-center gap-3 shadow-xs hover:border-[#D4952B]/60 disabled:opacity-50"
          >
            {isGoogleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#D4952B]" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>Continue with Google</span>
          </button>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-[#EDE8E0] w-full" />
            <span className="bg-white px-3 text-[10px] uppercase tracking-wider text-[#7F899F] font-bold absolute">
              OR CONTINUE WITH
            </span>
          </div>

          {/* Method Selector: Phone OTP vs Email */}
          <div className="flex rounded-2xl bg-[#FAF8F5] p-1 border border-[#EDE8E0]">
            <button
              type="button"
              onClick={() => {
                setMethod('phone');
                setErrorMessage(null);
                setInfoMessage(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                method === 'phone'
                  ? 'bg-white text-[#181D26] shadow-xs'
                  : 'text-[#7F899F] hover:text-[#181D26]'
              }`}
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Mobile OTP</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMethod('email');
                setErrorMessage(null);
                setInfoMessage(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                method === 'email'
                  ? 'bg-white text-[#181D26] shadow-xs'
                  : 'text-[#7F899F] hover:text-[#181D26]'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Email & Password</span>
            </button>
          </div>

          {/* Error Message Alert */}
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-600 text-xs font-medium flex items-center gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Info/Success Message */}
          {infoMessage && (
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{infoMessage}</span>
            </div>
          )}

          {/* METHOD 1: PHONE NUMBER WITH OTP */}
          {method === 'phone' && (
            <div className="space-y-4">
              {!otpSent ? (
                // Step 1: Input Phone Number
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-[#3D4658]">
                      Mobile Number
                    </label>
                    <div className="relative flex">
                      <div className="inline-flex items-center gap-1 px-3 py-2.5 bg-slate-50 border border-r-0 border-[#EDE8E0] rounded-l-xl text-xs font-bold text-[#3D4658]">
                        <span>🇮🇳</span>
                        <span>+91</span>
                      </div>
                      <input
                        type="tel"
                        maxLength={10}
                        required
                        value={phoneNumber}
                        onChange={e => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                        placeholder="98765 43210"
                        className="input-field rounded-l-none text-xs flex-1 font-mono tracking-wide"
                      />
                    </div>
                    <p className="text-[11px] text-[#7F899F]">
                      We'll send a 6-digit one-time verification password.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || phoneNumber.replace(/\D/g, '').length < 10}
                    className="w-full py-3 rounded-2xl bg-[#181D26] text-white text-xs font-bold hover:bg-[#2A3140] transition-all flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Sending OTP...</span>
                      </>
                    ) : (
                      <>
                        <span>Get Verification Code</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                // Step 2: Enter OTP Code
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-[#3D4658]">
                        Enter 6-Digit OTP
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setOtpSent(false);
                          setOtpCode('');
                          setErrorMessage(null);
                        }}
                        className="text-[11px] font-bold text-[#D4952B] hover:underline"
                      >
                        Change Number
                      </button>
                    </div>

                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-[#7F899F] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        maxLength={6}
                        required
                        autoFocus
                        value={otpCode}
                        onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="Enter 6-digit code"
                        className="input-field pl-9.5 text-center tracking-[0.4em] font-mono text-sm rounded-xl font-bold"
                      />
                    </div>

                    {testOtp && (
                      <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-center justify-between">
                        <span>🧪 Dev Code: <strong className="font-mono">{testOtp}</strong></span>
                        <button
                          type="button"
                          onClick={() => setOtpCode(testOtp)}
                          className="font-bold underline text-[#8C5D17]"
                        >
                          Auto-fill
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <button
                      type="button"
                      disabled={resendCountdown > 0 || isLoading}
                      onClick={() => handleSendOtp()}
                      className="inline-flex items-center gap-1 font-semibold text-[#5E687D] hover:text-[#181D26] disabled:opacity-40"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>{resendCountdown > 0 ? `Resend in ${resendCountdown}s` : 'Resend OTP'}</span>
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || otpCode.length < 6}
                    className="w-full py-3 rounded-2xl bg-[#181D26] text-white text-xs font-bold hover:bg-[#2A3140] transition-all flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <span>Verify & Sign In</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* METHOD 2: EMAIL & PASSWORD */}
          {method === 'email' && (
            <div className="space-y-4">
              {/* Sign In vs Create Account Mode Switcher */}
              <div className="flex justify-center gap-4 text-xs font-bold border-b border-[#EDE8E0] pb-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setErrorMessage(null);
                  }}
                  className={`pb-1 transition-all ${
                    mode === 'signin'
                      ? 'border-b-2 border-[#D4952B] text-[#181D26]'
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
                  className={`pb-1 transition-all ${
                    mode === 'signup'
                      ? 'border-b-2 border-[#D4952B] text-[#181D26]'
                      : 'text-[#7F899F] hover:text-[#181D26]'
                  }`}
                >
                  Create Account
                </button>
              </div>

              <form onSubmit={handleEmailSubmit} className="space-y-3.5">
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
                        <span>8+ chars, uppercase, number, symbol</span>
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
            </div>
          )}

          {/* Offline Guest Option */}
          <div className="pt-2 border-t border-[#EDE8E0]">
            <button
              type="button"
              onClick={onContinueOffline}
              className="w-full py-2.5 rounded-2xl bg-[#FAF8F5] border border-[#EDE8E0] hover:border-[#D4952B] text-xs font-bold text-[#3D4658] hover:text-[#181D26] transition-all flex items-center justify-center gap-2"
            >
              <WifiOff className="w-3.5 h-3.5 text-[#D4952B]" />
              <span>Continue Offline without Account (Guest)</span>
            </button>
          </div>

          {/* Privacy Footnote */}
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#7F899F] pt-1 text-center">
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