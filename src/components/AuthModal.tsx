import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  ArrowRight,
  Upload,
  User,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Key,
  Copy,
  Check,
} from 'lucide-react';
import { UserProfile, StoredUser } from '../types/auth';
import {
  findUserByAccountKey,
  findUserByAccountKeyAsync,
  saveUser,
  setCurrentUser,
  sendOtpEmail,
  generateAccountKey,
} from '../utils/authStorage';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserProfile) => void;
  initialMode?: 'login' | 'signup';
  modalNotice?: string;
}

type Step = 'login' | 'signup' | 'otp' | 'profile-setup' | 'key-reveal';

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  initialMode = 'login',
  modalNotice = '',
}) => {
  const [step, setStep] = useState<Step>(initialMode);

  // Login form state (Only Account Key!)
  const [accountKeyInput, setAccountKeyInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginSuccessNotice, setLoginSuccessNotice] = useState(modalNotice);

  // Signup form state
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupError, setSignupError] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);

  // OTP state
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpSuccessNotice, setOtpSuccessNotice] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Profile setup state
  const [profileName, setProfileName] = useState('');
  const [profileAvatar, setProfileAvatar] = useState<string>('');
  const [profileError, setProfileError] = useState('');
  const [generatedUserKey, setGeneratedUserKey] = useState('');
  const [isCopiedKey, setIsCopiedKey] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (modalNotice) {
      setLoginSuccessNotice(modalNotice);
    }
  }, [modalNotice]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  if (!isOpen) return null;

  // STEP 1: Handle Login Submit (Account Key Only)
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const trimmedKey = accountKeyInput.trim();
    if (!trimmedKey) {
      setLoginError('Please enter your Account Key.');
      return;
    }

    const user = await findUserByAccountKeyAsync(trimmedKey);
    if (!user) {
      setLoginError('Invalid Account Key. Please check the key and try again.');
      return;
    }

    onLoginSuccess({
      name: user.name,
      email: user.email,
      accountKey: user.accountKey,
      avatarUrl: user.avatarUrl,
      isAdmin: user.isAdmin,
      hideEmail: user.hideEmail,
      notificationsEnabled: user.notificationsEnabled,
    });
    onClose();
  };

  // STEP 2: Handle Signup Submit & Dispatch EmailJS OTP
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError('');

    if (!signupName.trim() || !signupEmail.trim()) {
      setSignupError('Please fill in your name and email.');
      return;
    }

    setIsSendingOtp(true);

    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(newOtp);

    const result = await sendOtpEmail({
      name: signupName.trim(),
      email: signupEmail.trim(),
      passcode: newOtp,
    });

    setIsSendingOtp(false);

    if (result.success) {
      setEnteredOtp('');
      setOtpError('');
      setOtpSuccessNotice(
        `A 6-digit passcode has been transmitted to ${signupEmail.trim()}`
      );
      setProfileName(signupName.trim());
      setResendCooldown(30);
      setStep('otp');
    } else {
      setEnteredOtp('');
      setOtpError(
        result.error
          ? `${result.error}. (Passcode: ${newOtp})`
          : 'Could not send verification email.'
      );
      setProfileName(signupName.trim());
      setStep('otp');
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isSendingOtp) return;
    setIsSendingOtp(true);
    setOtpError('');

    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(newOtp);

    const result = await sendOtpEmail({
      name: signupName.trim(),
      email: signupEmail.trim(),
      passcode: newOtp,
    });

    setIsSendingOtp(false);
    setResendCooldown(30);

    if (result.success) {
      setOtpSuccessNotice(`New passcode dispatched to ${signupEmail.trim()}`);
    } else {
      setOtpError(`Could not resend: ${result.error || 'Failed'}. (Code: ${newOtp})`);
    }
  };

  // Verify OTP
  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError('');

    if (enteredOtp.trim() !== generatedOtp.trim()) {
      setOtpError('Incorrect passcode. Please enter the 6-digit code sent to your email.');
      return;
    }

    // Passcode verified -> Move to Profile Setup
    if (!profileName.trim() && signupName.trim()) {
      setProfileName(signupName.trim());
    }
    setStep('profile-setup');
  };

  // Handle Image Upload with Canvas compression to avoid localStorage quota failure
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setProfileError('Please upload an image file (PNG, JPG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setProfileError('Image size must be less than 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const rawResult = reader.result;
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const size = 160;
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              const minDim = Math.min(img.width, img.height);
              const sx = (img.width - minDim) / 2;
              const sy = (img.height - minDim) / 2;
              ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
              const compressed = canvas.toDataURL('image/jpeg', 0.85);
              setProfileAvatar(compressed);
            } else {
              setProfileAvatar(rawResult);
            }
          } catch {
            setProfileAvatar(rawResult);
          }
          setProfileError('');
        };
        img.onerror = () => {
          setProfileAvatar(rawResult);
          setProfileError('');
        };
        img.src = rawResult;
      }
    };
    reader.readAsDataURL(file);
  };

  // STEP 3: Handle Profile Setup -> Generate Unique Account Key
  const handleProfileComplete = (e?: React.FormEvent | React.MouseEvent) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    setProfileError('');

    // Fallback: If display name is blank, use signupName or 'ZeptaLabs Member'
    const finalName = profileName.trim() || signupName.trim() || 'ZeptaLabs Member';
    const finalAvatar = profileAvatar || 'logo.png';
    const newUniqueKey = generateAccountKey();

    const newUser: StoredUser = {
      name: finalName,
      email: signupEmail.trim() || 'member@zeptalabs.com',
      accountKey: newUniqueKey,
      avatarUrl: finalAvatar,
      createdAt: new Date().toISOString(),
      isAdmin: false,
      notificationsEnabled: true,
    };

    try {
      saveUser(newUser);
      setCurrentUser(newUser);
    } catch (saveErr) {
      console.warn('User storage save notice:', saveErr);
    }

    // Move to key reveal step immediately
    setStep('key-reveal');
  };

  const handleModalClose = () => {
    if (step === 'key-reveal' && generatedUserKey) {
      handleProceedWithNewAccount();
      return;
    }
    onClose();
  };

  const handleCopyGeneratedKey = () => {
    if (!generatedUserKey) return;
    navigator.clipboard.writeText(generatedUserKey);
    setIsCopiedKey(true);
    setTimeout(() => setIsCopiedKey(false), 2500);
  };

  const handleProceedWithNewAccount = () => {
    let user = null;
    try {
      user = findUserByAccountKey(generatedUserKey);
    } catch (err) {
      console.warn('findUserByAccountKey notice:', err);
    }
    const finalName = profileName.trim() || signupName.trim() || 'ZeptaLabs Member';
    const finalAvatar = profileAvatar || 'logo.png';

    onLoginSuccess({
      name: user ? user.name : finalName,
      email: user ? user.email : (signupEmail.trim() || 'member@zeptalabs.com'),
      accountKey: generatedUserKey,
      avatarUrl: user ? user.avatarUrl : finalAvatar,
      isAdmin: false,
      notificationsEnabled: true,
    });
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleModalClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs"
        />

        {/* Modal Dialog Card */}
        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative w-full max-w-md bg-white border border-neutral-300 p-6 sm:p-8 z-10 shadow-2xl max-h-[92vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-neutral-200">
            <div>
              <h2 className="text-lg font-bold text-black tracking-tight flex items-center gap-2">
                <Key className="w-4 h-4 text-black" />
                <span>
                  {step === 'login' && 'Account Login'}
                  {step === 'signup' && 'Create Account'}
                  {step === 'otp' && 'Verify Email'}
                  {step === 'profile-setup' && 'Profile Setup'}
                  {step === 'key-reveal' && 'Your Account Key'}
                </span>
              </h2>
              <p className="text-[11px] text-neutral-500 font-mono">
                ZEPTALABS SECURE KEY AUTHENTICATION
              </p>
            </div>
            <button
              type="button"
              onClick={handleModalClose}
              className="p-1 text-neutral-500 hover:text-black transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* VIEW: LOGIN (ACCOUNT KEY ONLY) */}
          {step === 'login' && (
            <div className="mt-6">
              {/* Tab Switcher */}
              <div className="flex border border-neutral-200 p-1 bg-neutral-100 mb-5">
                <button
                  type="button"
                  className="flex-1 py-1.5 text-xs font-semibold uppercase bg-white text-black shadow-xs"
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStep('signup');
                    setSignupError('');
                    setLoginSuccessNotice('');
                  }}
                  className="flex-1 py-1.5 text-xs font-semibold uppercase text-neutral-600 hover:text-black transition-colors"
                >
                  Sign Up
                </button>
              </div>

              {loginSuccessNotice && (
                <div className="mb-4 p-3 bg-neutral-50 border border-neutral-300 text-xs text-neutral-800 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-black shrink-0 mt-0.5" />
                  <span>{loginSuccessNotice}</span>
                </div>
              )}

              {loginError && (
                <div className="mb-4 p-3 bg-neutral-50 border border-black text-xs text-black flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{loginError}</span>
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1.5">
                    Enter Account Key
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={accountKeyInput}
                      onChange={(e) => setAccountKeyInput(e.target.value.trim())}
                      placeholder="#YourAccountKey"
                      className="w-full px-3.5 py-2.5 border border-neutral-300 bg-white text-black text-xs sm:text-sm font-mono focus:outline-none focus:border-black font-medium"
                    />
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-1.5 font-normal">
                    Enter your unique key (starts with <span className="font-mono font-bold text-black">#</span>).
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full bg-black text-white text-sm font-semibold py-2.5 hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <span>Login with Key</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-center text-xs text-neutral-500 pt-2 font-mono">
                  Don't have an Account Key?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setStep('signup');
                      setSignupError('');
                      setLoginSuccessNotice('');
                    }}
                    className="text-black underline font-bold hover:text-neutral-700"
                  >
                    Generate Key
                  </button>
                </p>
              </form>
            </div>
          )}

          {/* VIEW: SIGNUP */}
          {step === 'signup' && (
            <div className="mt-6">
              {/* Tab Switcher */}
              <div className="flex border border-neutral-200 p-1 bg-neutral-100 mb-5">
                <button
                  type="button"
                  onClick={() => {
                    setStep('login');
                    setLoginError('');
                  }}
                  className="flex-1 py-1.5 text-xs font-semibold uppercase text-neutral-600 hover:text-black transition-colors"
                >
                  Login
                </button>
                <button
                  type="button"
                  className="flex-1 py-1.5 text-xs font-semibold uppercase bg-white text-black shadow-xs"
                >
                  Sign Up
                </button>
              </div>

              {signupError && (
                <div className="mb-4 p-3 bg-neutral-50 border border-black text-xs text-black flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{signupError}</span>
                </div>
              )}

              <form onSubmit={handleSignupSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                    Your Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full px-3 py-2 border border-neutral-300 bg-white text-black text-sm focus:outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full px-3 py-2 border border-neutral-300 bg-white text-black text-sm focus:outline-none focus:border-black"
                  />
                  <p className="text-[11px] text-neutral-500 mt-1 font-mono">
                    Used once to verify your identity via OTP.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSendingOtp}
                    className="w-full bg-black text-white text-sm font-semibold py-2.5 hover:bg-neutral-800 disabled:bg-neutral-600 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    {isSendingOtp ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Sending Passcode...</span>
                      </>
                    ) : (
                      <>
                        <span>Continue to Verification</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>

                <p className="text-center text-xs text-neutral-500 pt-2 font-mono">
                  Already have your key?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setStep('login');
                      setLoginError('');
                    }}
                    className="text-black underline font-bold hover:text-neutral-700"
                  >
                    Login
                  </button>
                </p>
              </form>
            </div>
          )}

          {/* VIEW: OTP CODE INTERFACE */}
          {step === 'otp' && (
            <div className="mt-6">
              <div className="text-center mb-5">
                <h3 className="text-base font-bold text-black">
                  Enter Verification Code
                </h3>
                <p className="text-xs text-neutral-600 mt-1">
                  A 6-digit code was dispatched to{' '}
                  <span className="font-semibold text-black">{signupEmail}</span>.
                </p>
              </div>

              {otpSuccessNotice && (
                <div className="mb-4 p-3 bg-neutral-50 border border-neutral-300 text-xs text-neutral-800 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-black shrink-0 mt-0.5" />
                  <span>{otpSuccessNotice}</span>
                </div>
              )}

              {otpError && (
                <div className="mb-4 p-3 bg-neutral-50 border border-black text-xs text-black flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{otpError}</span>
                </div>
              )}

              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1 text-center">
                    6-Digit Passcode
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={enteredOtp}
                    onChange={(e) =>
                      setEnteredOtp(e.target.value.replace(/\D/g, ''))
                    }
                    placeholder="••••••"
                    className="w-full text-center text-2xl tracking-[0.5em] font-mono py-2.5 border border-neutral-300 bg-white text-black focus:outline-none focus:border-black font-bold"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-black text-white text-sm font-semibold py-2.5 hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <span>Verify Passcode</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="flex items-center justify-between pt-2 text-xs font-mono">
                  <button
                    type="button"
                    onClick={() => setStep('signup')}
                    className="text-neutral-500 hover:text-black underline"
                  >
                    Change Email
                  </button>

                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendCooldown > 0 || isSendingOtp}
                    className="text-black font-semibold hover:text-neutral-700 disabled:text-neutral-400 flex items-center gap-1"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${
                        isSendingOtp ? 'animate-spin' : ''
                      }`}
                    />
                    <span>
                      {resendCooldown > 0
                        ? `Resend in ${resendCooldown}s`
                        : 'Resend Passcode'}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* VIEW: PROFILE SETUP */}
          {step === 'profile-setup' && (
            <div className="mt-6">
              <div className="text-center mb-5">
                <h3 className="text-base font-bold text-black">
                  Set Up Your Profile
                </h3>
                <p className="text-xs text-neutral-600 mt-1">
                  Upload an avatar photo and confirm your name.
                </p>
              </div>

              {profileError && (
                <div className="mb-4 p-3 bg-neutral-50 border border-black text-xs text-black flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{profileError}</span>
                </div>
              )}

              <form onSubmit={handleProfileComplete} className="space-y-5">
                {/* Photo Uploader */}
                <div className="flex flex-col items-center">
                  <div className="relative mb-3">
                    <div className="w-24 h-24 rounded-full border-2 border-black overflow-hidden bg-neutral-100 flex items-center justify-center p-0.5">
                      {profileAvatar ? (
                        <img
                          src={profileAvatar}
                          alt="Profile Preview"
                          className="w-full h-full object-cover rounded-full"
                        />
                      ) : (
                        <User className="w-10 h-10 text-neutral-400" />
                      )}
                    </div>
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    className="hidden"
                  />

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 border border-black text-xs font-semibold uppercase tracking-wider text-black hover:bg-neutral-100 transition-colors flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{profileAvatar ? 'Change Photo' : 'Upload Photo'}</span>
                    </button>
                    {profileAvatar && (
                      <button
                        type="button"
                        onClick={() => setProfileAvatar('')}
                        className="px-2 py-1.5 text-xs text-neutral-500 hover:text-black"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-neutral-400 font-mono mt-1">
                    PNG, JPG or WebP (Max 2MB)
                  </p>
                </div>

                {/* Display Name Input */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="Enter your name (e.g. John Doe)"
                    className="w-full px-3 py-2 border border-neutral-300 bg-white text-black text-sm focus:outline-none focus:border-black font-medium"
                  />
                  <p className="text-[11px] text-neutral-500 mt-1 font-mono">
                    This will appear on your comments and profile.
                  </p>
                </div>

                <button
                  type="button"
                  id="btnGenerateAccountKey"
                  onClick={handleProfileComplete}
                  className="w-full bg-black text-white text-sm font-semibold py-2.5 hover:bg-neutral-800 active:bg-neutral-900 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <Key className="w-4 h-4" />
                  <span>Generate My Account Key</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

          {/* VIEW: NEW ACCOUNT KEY REVEAL */}
          {step === 'key-reveal' && (
            <div className="mt-6 space-y-5">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full border-2 border-black flex items-center justify-center mx-auto mb-3 bg-neutral-100">
                  <Key className="w-6 h-6 text-black" />
                </div>
                <h3 className="text-base font-bold text-black tracking-tight">
                  Your Unique Account Key
                </h3>
                <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                  Save this key carefully. You will use this key directly to log in across all devices.
                </p>
              </div>

              {/* Account Key Box */}
              <div className="p-4 bg-neutral-50 border-2 border-black">
                <div className="text-[10px] uppercase font-mono font-bold text-neutral-500 mb-1.5 flex items-center justify-between">
                  <span>ACCOUNT KEY (UNIQUE)</span>
                  {isCopiedKey && (
                    <span className="text-black flex items-center gap-1 font-bold">
                      <Check className="w-3 h-3" /> Copied!
                    </span>
                  )}
                </div>
                <div className="font-mono text-sm sm:text-base font-bold text-black break-all select-all tracking-wider py-1">
                  {generatedUserKey}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCopyGeneratedKey}
                  className="flex-1 py-2.5 px-3 border border-black text-black text-xs font-semibold uppercase hover:bg-neutral-100 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isCopiedKey ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Key Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Account Key</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleProceedWithNewAccount}
                  className="flex-1 py-2.5 px-3 bg-black text-white text-xs font-semibold uppercase hover:bg-neutral-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span>Log In Now</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
