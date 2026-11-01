import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Menu,
  X,
  ArrowRight,
  LogOut,
  User,
  PlusCircle,
  ShieldCheck,
  Bell,
  Key,
  Eye,
  EyeOff,
  Copy,
  Check,
  RefreshCw,
  ChevronDown,
} from 'lucide-react';
import { UserProfile } from '../types/auth';
import { toggleUserNotifications } from '../utils/authStorage';
import {
  requestBrowserNotificationPermission,
  triggerPushNotification,
} from '../utils/pushNotification';

interface NavbarProps {
  currentUser: UserProfile | null;
  onOpenAuth: (mode?: 'login' | 'signup', notice?: string) => void;
  onLogout: () => void;
  onOpenShareModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onOpenAuth,
  onLogout,
  onOpenShareModal,
}) => {
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isKeyVisible, setIsKeyVisible] = useState(false);
  const [isCopiedKey, setIsCopiedKey] = useState(false);
  const [logoLoadError, setLogoLoadError] = useState(false);
  const [notificationsOn, setNotificationsOn] = useState(
    currentUser?.notificationsEnabled ?? true
  );

  const profileDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentUser) {
      setNotificationsOn(currentUser.notificationsEnabled ?? true);
    }
  }, [currentUser]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        profileDropdownRef.current &&
        !profileDropdownRef.current.contains(e.target as Node)
      ) {
        setIsProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const resolvedAccountKey = (currentUser?.accountKey && currentUser.accountKey.trim()) || '';

  // Synchronize accountKey into currentUser if missing
  useEffect(() => {
    if (currentUser && (!currentUser.accountKey || currentUser.accountKey.trim() === '')) {
      if (resolvedAccountKey) {
        currentUser.accountKey = resolvedAccountKey;
        try {
          localStorage.setItem('zeptalabs_current_user', JSON.stringify(currentUser));
        } catch {}
      }
    }
  }, [currentUser, resolvedAccountKey]);

  const handleToggleNotifications = async () => {
    if (!currentUser || !resolvedAccountKey) return;
    const nextState = toggleUserNotifications(resolvedAccountKey);
    setNotificationsOn(nextState);

    if (nextState) {
      // User activated notifications -> request browser permission and send confirmation
      const granted = await requestBrowserNotificationPermission();
      if (granted) {
        await triggerPushNotification({
          title: 'ZeptaLabs Notifications Active',
          body: 'You will receive real-time push alerts from Chrome whenever admin uploads a news or update.',
          tag: 'notification-welcome',
        });
      }
    }
  };

  const handleCopyKey = () => {
    const keyToCopy = resolvedAccountKey || currentUser?.accountKey || '';
    if (!keyToCopy) return;
    navigator.clipboard.writeText(keyToCopy);
    setIsCopiedKey(true);
    setTimeout(() => setIsCopiedKey(false), 2000);
  };

  const handleSwitchAccount = () => {
    setIsProfileDropdownOpen(false);
    setIsMobileMenuOpen(false);
    onOpenAuth('login', 'Enter Account Key to switch account:');
  };

  const navLinks = [
    { label: 'Home', href: '#' },
    { label: 'News', href: '#news' },
    { label: 'Updates', href: '#updates' },
    { label: 'About', href: '#about' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-neutral-200 transition-all duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Left: Brand Logo linking to logo.png in Circular Frame */}
          <div className="flex items-center">
            <motion.a
              href="logo.png"
              target="_blank"
              rel="noopener noreferrer"
              title="Open logo.png"
              className="flex items-center gap-2.5 sm:gap-3 group cursor-pointer"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              {/* Circular Logo Frame */}
              <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 border-neutral-300 group-hover:border-black overflow-hidden bg-white flex items-center justify-center p-0.5 shadow-xs transition-colors shrink-0">
                {!logoLoadError ? (
                  <img
                    src="logo.png"
                    alt="ZeptaLabs Logo"
                    onError={() => setLogoLoadError(true)}
                    className="w-full h-full object-cover rounded-full transition-transform duration-200 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-black text-white flex items-center justify-center font-bold text-xs uppercase tracking-wider">
                    ZL
                  </div>
                )}
              </div>

              <div className="flex flex-col">
                <span className="font-bold text-base sm:text-lg tracking-tight text-black leading-tight select-none">
                  ZeptaLabs
                </span>
                <span className="text-[10px] sm:text-[11px] font-normal text-neutral-500 uppercase tracking-wider">
                  News&amp;Updates
                </span>
              </div>
            </motion.a>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2 relative">
            {navLinks.map((link) => {
              const isHovered = hoveredNav === link.label;

              return (
                <a
                  key={link.label}
                  href={link.href}
                  onMouseEnter={() => setHoveredNav(link.label)}
                  onMouseLeave={() => setHoveredNav(null)}
                  className="relative px-3.5 py-2 text-sm font-medium text-neutral-600 hover:text-black transition-colors focus:outline-none"
                >
                  <span className="relative z-10">{link.label}</span>

                  {/* Smooth Hover Pill Animation */}
                  {isHovered && (
                    <motion.div
                      layoutId="navHoverPill"
                      className="absolute inset-0 bg-neutral-100 z-0"
                      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    />
                  )}
                </a>
              );
            })}
          </nav>

          {/* Right: User Account Profile / Actions */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {currentUser ? (
              <div className="flex items-center gap-2 sm:gap-3" ref={profileDropdownRef}>
                {/* Admin "Share An Update/News" Button */}
                {currentUser.isAdmin && (
                  <motion.button
                    type="button"
                    onClick={onOpenShareModal}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-black text-white hover:bg-neutral-800 transition-colors cursor-pointer shadow-xs whitespace-nowrap"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Share An Update/News</span>
                  </motion.button>
                )}

                {/* Profile Trigger Button */}
                <div className="relative">
                  <motion.button
                    type="button"
                    onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 bg-neutral-50 hover:bg-neutral-100 border border-neutral-300 hover:border-black transition-colors cursor-pointer"
                    aria-label="User profile menu"
                  >
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-black overflow-hidden bg-white flex items-center justify-center shrink-0">
                      {currentUser.avatarUrl ? (
                        <img
                          src={currentUser.avatarUrl}
                          alt={currentUser.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = 'logo.png';
                          }}
                        />
                      ) : (
                        <User className="w-4 h-4 text-neutral-600" />
                      )}
                    </div>

                    <div className="hidden sm:flex flex-col text-left">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-black max-w-[120px] truncate leading-tight">
                          {currentUser.name}
                        </span>
                        {currentUser.isAdmin && (
                          <ShieldCheck className="w-3 h-3 text-black shrink-0" />
                        )}
                      </div>
                      <span className="text-[10px] text-neutral-500 font-mono">
                        {currentUser.isAdmin ? 'Official Admin' : 'Account Key'}
                      </span>
                    </div>

                    <ChevronDown
                      className={`w-3.5 h-3.5 text-neutral-600 transition-transform duration-200 ${
                        isProfileDropdownOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </motion.button>

                  {/* USER PROFILE DROPDOWN MENU */}
                  <AnimatePresence>
                    {isProfileDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.96 }}
                        transition={{ duration: 0.16, ease: 'easeOut' }}
                        className="absolute right-0 mt-2 w-72 sm:w-80 bg-white border-2 border-black p-4 z-50 shadow-2xl space-y-4"
                      >
                        {/* Profile Header */}
                        <div className="flex items-center gap-3 pb-3 border-b border-neutral-200">
                          <div className="w-10 h-10 rounded-full border-2 border-black overflow-hidden bg-white shrink-0">
                            <img
                              src={currentUser.avatarUrl || 'logo.png'}
                              alt={currentUser.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = 'logo.png';
                              }}
                            />
                          </div>
                          <div className="overflow-hidden">
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-sm font-bold text-black truncate">
                                {currentUser.name}
                              </h4>
                              {currentUser.isAdmin && (
                                <span className="text-[9px] font-mono uppercase bg-black text-white px-1.5 py-0.2 font-bold shrink-0">
                                  Official
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-neutral-500 font-mono">
                              Active Session
                            </span>
                          </div>
                        </div>

                        {/* OPTION 1: Notify me for news&updates */}
                        <div className="flex items-center justify-between p-2.5 bg-neutral-50 border border-neutral-200">
                          <div className="flex items-center gap-2">
                            <Bell className="w-4 h-4 text-black shrink-0" />
                            <div>
                              <p className="text-xs font-semibold text-black leading-tight">
                                Notify me for news&amp;updates
                              </p>
                              <p className="text-[10px] text-neutral-500">
                                {notificationsOn ? 'Active' : 'Muted'}
                              </p>
                            </div>
                          </div>

                          {/* Toggle Switch */}
                          <button
                            type="button"
                            onClick={handleToggleNotifications}
                            className={`w-10 h-5 flex items-center p-0.5 rounded-full transition-colors cursor-pointer ${
                              notificationsOn ? 'bg-black' : 'bg-neutral-300'
                            }`}
                            aria-label="Toggle notifications"
                          >
                            <motion.div
                              layout
                              className="w-4 h-4 rounded-full bg-white shadow-xs"
                              animate={{ x: notificationsOn ? 20 : 0 }}
                              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                            />
                          </button>
                        </div>

                        {/* OPTION 2: Account key (with hide/unhide and copy button) */}
                        <div className="p-3 bg-neutral-50 border border-neutral-200 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-700">
                              <Key className="w-3.5 h-3.5 text-black" />
                              <span>Account key</span>
                            </div>

                            {/* Right side Hide / Unhide Button */}
                            <button
                              type="button"
                              onClick={() => setIsKeyVisible(!isKeyVisible)}
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-black hover:text-neutral-700 underline cursor-pointer"
                            >
                              {isKeyVisible ? (
                                <>
                                  <EyeOff className="w-3 h-3" />
                                  <span>Hide</span>
                                </>
                              ) : (
                                <>
                                  <Eye className="w-3 h-3" />
                                  <span>Unhide</span>
                                </>
                              )}
                            </button>
                          </div>

                          {/* Key Display Container */}
                          <div className="flex items-center justify-between gap-2 p-2.5 bg-neutral-100 border border-neutral-300 font-mono text-xs select-all">
                            <span
                              className={`flex-1 font-mono tracking-wider break-all select-all ${
                                isKeyVisible ? 'text-black font-bold' : 'text-neutral-500 font-medium'
                              }`}
                              title={isKeyVisible ? resolvedAccountKey : 'Account Key (Hidden)'}
                            >
                              {isKeyVisible
                                ? (resolvedAccountKey || 'Key Unavailable')
                                : '••••••••••••••••••••••••'}
                            </span>
                            <button
                              type="button"
                              onClick={handleCopyKey}
                              className="px-2 py-1 bg-white border border-neutral-300 hover:border-black text-black text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors shrink-0 shadow-2xs"
                              title="Copy Account Key"
                            >
                              {isCopiedKey ? (
                                <>
                                  <Check className="w-3 h-3 text-black" />
                                  <span>Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Mobile Share Button if Admin */}
                        {currentUser.isAdmin && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsProfileDropdownOpen(false);
                              onOpenShareModal();
                            }}
                            className="w-full sm:hidden py-2 px-3 text-xs font-semibold bg-black text-white hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2"
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                            <span>Share An Update/News</span>
                          </button>
                        )}

                        {/* OPTION 3: Switch account */}
                        <button
                          type="button"
                          onClick={handleSwitchAccount}
                          className="w-full text-left px-3 py-2 text-xs font-semibold border border-neutral-300 hover:border-black text-black hover:bg-neutral-50 transition-colors flex items-center gap-2 cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5 text-black" />
                          <span>Switch account</span>
                        </button>

                        {/* OPTION 4: Logout */}
                        <div className="pt-2 border-t border-neutral-200">
                          <button
                            type="button"
                            onClick={() => {
                              setIsProfileDropdownOpen(false);
                              onLogout();
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-semibold text-neutral-700 hover:text-black hover:bg-neutral-100 transition-colors flex items-center gap-2 cursor-pointer"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>Logout</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            ) : (
              /* User not logged in: show black Login / Signup button */
              <motion.button
                type="button"
                onClick={() => onOpenAuth('login')}
                whileHover={{ scale: 1.04, y: -1 }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 450, damping: 25 }}
                className="inline-flex items-center gap-2 bg-black text-white text-xs sm:text-sm font-medium px-3.5 py-2 hover:bg-neutral-800 transition-colors cursor-pointer shadow-xs whitespace-nowrap"
              >
                <span>Login / Signup</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1" />
              </motion.button>
            )}

            {/* Mobile Menu Hamburger */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-black hover:bg-neutral-100 transition-colors border border-neutral-200"
              aria-label="Toggle Navigation Menu"
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </motion.button>
          </div>
        </div>
      </div>

      {/* Mobile Dropdown Navigation */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="md:hidden border-t border-neutral-200 bg-white overflow-hidden px-4 pt-3 pb-5 space-y-2 shadow-md"
          >
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-3.5 py-2 text-sm font-medium text-neutral-700 hover:text-black hover:bg-neutral-100 transition-colors"
              >
                {link.label}
              </a>
            ))}

            <div className="pt-3 border-t border-neutral-200">
              {currentUser ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 bg-neutral-50 border border-neutral-200">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full border border-black overflow-hidden bg-white shrink-0">
                        <img
                          src={currentUser.avatarUrl || 'logo.png'}
                          alt={currentUser.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = 'logo.png';
                          }}
                        />
                      </div>
                      <span className="text-xs font-bold text-black">
                        {currentUser.name}
                      </span>
                    </div>
                    {currentUser.isAdmin && (
                      <span className="text-[9px] font-mono uppercase bg-black text-white px-1.5 py-0.2 font-bold">
                        Official
                      </span>
                    )}
                  </div>

                  {currentUser.isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        onOpenShareModal();
                      }}
                      className="w-full bg-black text-white text-xs font-semibold px-4 py-2.5 flex items-center justify-center gap-2 hover:bg-neutral-800 transition-colors"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>Share An Update/News</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleSwitchAccount}
                    className="w-full border border-neutral-300 text-black text-xs font-semibold px-4 py-2 flex items-center justify-center gap-2 hover:bg-neutral-50 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Switch account</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full border border-black text-black text-xs font-medium px-4 py-2 flex items-center justify-center gap-2 hover:bg-neutral-100 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Logout</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenAuth('login');
                  }}
                  className="w-full bg-black text-white text-sm font-medium px-4 py-2.5 flex items-center justify-center gap-2 hover:bg-neutral-800 transition-colors"
                >
                  <span>Login / Signup</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
};
