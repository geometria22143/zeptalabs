export interface UserProfile {
  name: string;
  email?: string;
  accountKey: string;
  avatarUrl: string;
  createdAt?: string;
  isAdmin?: boolean;
  hideEmail?: boolean;
  notificationsEnabled?: boolean;
}

export interface StoredUser {
  name: string;
  email?: string;
  accountKey: string;
  avatarUrl: string;
  createdAt: string;
  isAdmin?: boolean;
  hideEmail?: boolean;
  notificationsEnabled?: boolean;
}
