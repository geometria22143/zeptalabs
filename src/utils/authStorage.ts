import emailjs from '@emailjs/browser';
import { StoredUser, UserProfile } from '../types/auth';

const USERS_KEY = 'zeptalabs_users';
const CURRENT_USER_KEY = 'zeptalabs_current_user';

export const EMAILJS_CONFIG = {
  serviceId: 'service_wotox2121',
  templateId: 'template_2f2zlo1',
  publicKey: '3KhMYEXg6XYbAUOyW',
};

import { verifyAdminKey } from './crypto';

// Generate random unique account key matching format #...
export function generateAccountKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '#';
  for (let i = 0; i < 22; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function getStoredUsers(): StoredUser[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Sanitize and defend each user against null/undefined accountKey
    return parsed
      .filter((u): u is StoredUser => Boolean(u && typeof u === 'object'))
      .map((u) => {
        const safeKey =
          typeof u.accountKey === 'string' && u.accountKey.trim() !== ''
            ? u.accountKey.trim()
            : generateAccountKey();
        return {
          ...u,
          accountKey: safeKey,
          name: u.name || 'ZeptaLabs Member',
          avatarUrl: u.avatarUrl || 'logo.png',
          createdAt: u.createdAt || new Date().toISOString(),
          notificationsEnabled: u.notificationsEnabled !== false,
        };
      });
  } catch {
    return [];
  }
}

export function saveUser(user: StoredUser): void {
  try {
    if (!user || typeof user !== 'object') return;

    // Ensure valid non-empty accountKey
    if (!user.accountKey || typeof user.accountKey !== 'string' || user.accountKey.trim() === '') {
      user.accountKey = generateAccountKey();
    }

    const targetKey = user.accountKey.trim().toLowerCase();
    const existingUsers = getStoredUsers();

    // Safely filter out previous entry for this accountKey (with null-safe check)
    const users = existingUsers.filter((u) => {
      const uKey = (u?.accountKey || '').trim().toLowerCase();
      return uKey !== '' && uKey !== targetKey;
    });

    users.push(user);

    try {
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
    } catch (quotaError) {
      console.warn('LocalStorage quota warning in saveUser, falling back to trimmed storage', quotaError);
      // Fallback with default avatar if large image caused quota failure
      const fallbackUsers = users.map((u) =>
        (u?.accountKey || '').trim().toLowerCase() === targetKey ? { ...user, avatarUrl: 'logo.png' } : u
      );
      try {
        localStorage.setItem(USERS_KEY, JSON.stringify(fallbackUsers));
      } catch {}
    }

    // Synchronize to backend server so user profile is persistent across sessions and devices
    try {
      fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: user.name,
          accountKey: user.accountKey,
          email: user.email,
          avatarUrl: user.avatarUrl,
          notificationsEnabled: user.notificationsEnabled,
        }),
      }).catch(() => {});
    } catch {}
  } catch (err) {
    console.error('Error saving user to storage:', err);
  }
}

export function findUserByAccountKey(key: string): StoredUser | null {
  if (!key || typeof key !== 'string') return null;
  const trimmed = key.trim();
  if (!trimmed) return null;

  const normalizedKey = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;

  // Cryptographically secure Admin Master Key Verification (One-way SHA-256)
  // Zero plaintext key exposure in scripts/bundles
  if (verifyAdminKey(trimmed)) {
    return {
      name: 'ZeptaLabs Officials',
      accountKey: normalizedKey,
      avatarUrl: 'logo.png',
      createdAt: 'Permanent',
      isAdmin: true,
      hideEmail: true,
      notificationsEnabled: true,
    };
  }

  const users = getStoredUsers();
  const rawWithoutHash = trimmed.replace(/^#+/, '').toLowerCase();
  return (
    users.find((u) => {
      const uKey = (u?.accountKey || '').trim().toLowerCase();
      if (!uKey) return false;
      const uKeyWithoutHash = uKey.replace(/^#+/, '');
      return (
        uKey === trimmed.toLowerCase() ||
        uKey === normalizedKey.toLowerCase() ||
        uKeyWithoutHash === rawWithoutHash
      );
    }) || null
  );
}

export async function findUserByAccountKeyAsync(key: string): Promise<StoredUser | null> {
  const local = findUserByAccountKey(key);
  if (local) return local;

  try {
    const res = await fetch('/api/users/find', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.found && data.user) {
        saveUser(data.user);
        return data.user;
      }
    }
  } catch {}

  return null;
}

export function getCurrentUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    if (!raw) return null;
    const user: UserProfile = JSON.parse(raw);
    if (!user || typeof user !== 'object') return null;

    if (!user.accountKey || typeof user.accountKey !== 'string' || user.accountKey.trim() === '') {
      user.accountKey = generateAccountKey();
      try {
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
      } catch {}
    }
    return user;
  } catch {
    return null;
  }
}

export function setCurrentUser(user: UserProfile | null): void {
  try {
    if (user) {
      if (!user.accountKey || typeof user.accountKey !== 'string' || user.accountKey.trim() === '') {
        user.accountKey = generateAccountKey();
      }
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
  } catch (err) {
    console.warn('setCurrentUser notice:', err);
  }
}

export function toggleUserNotifications(accountKey: string): boolean {
  if (!accountKey) return false;
  const users = getStoredUsers();
  let newState = false;
  const safeAccountKey = accountKey.trim().toLowerCase();

  const updated = users.map((u) => {
    if ((u?.accountKey || '').trim().toLowerCase() === safeAccountKey) {
      newState = !u.notificationsEnabled;
      return { ...u, notificationsEnabled: newState };
    }
    return u;
  });

  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(updated));
  } catch {}

  const current = getCurrentUser();
  if (current && (current?.accountKey || '').trim().toLowerCase() === safeAccountKey) {
    current.notificationsEnabled = newState;
    setCurrentUser(current);
  }
  return newState;
}

export async function sendOtpEmail(params: {
  name: string;
  email: string;
  passcode: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const now = new Date();
    const timeFormatted = now.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const templateParams = {
      email: params.email,
      name: params.name,
      passcode: params.passcode,
      time: timeFormatted,
      to_email: params.email,
      to_name: params.name,
      reply_to: params.email,
      user_email: params.email,
      user_name: params.name,
      code: params.passcode,
      otp: params.passcode,
    };

    const response = await emailjs.send(
      EMAILJS_CONFIG.serviceId,
      EMAILJS_CONFIG.templateId,
      templateParams,
      EMAILJS_CONFIG.publicKey
    );

    if (response.status === 200) {
      return { success: true };
    }
    return { success: false, error: `EmailJS responded with status: ${response.status}` };
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error
        ? err.message
        : typeof err === 'object' && err !== null && 'text' in err
        ? String((err as { text: unknown }).text)
        : 'Failed to send OTP email.';
    return { success: false, error: errorMsg };
  }
}
