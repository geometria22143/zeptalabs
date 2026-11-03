import { pgTable, text, integer, jsonb, timestamp } from 'drizzle-orm/pg-core';

export interface CommentRecord {
  id: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  createdAt: string;
  likes: number;
  likedBy: string[];
}

export interface AttachmentRecord {
  name: string;
  type: string;
  dataUrl: string;
  sizeFormatted: string;
}

export const posts = pgTable('posts', {
  id: text().primaryKey(),
  category: text().notNull(),
  title: text().notNull(),
  description: text(),
  attachment: jsonb().$type<AttachmentRecord>(),
  authorName: text('author_name').notNull().default('ZeptaLabs Officials'),
  authorAvatar: text('author_avatar').notNull().default('logo.png'),
  // Human-readable display date, kept as the client expects it
  createdAt: text('created_at').notNull(),
  likes: integer().notNull().default(0),
  likedBy: jsonb('liked_by').$type<string[]>().notNull().default([]),
  shares: integer().notNull().default(0),
  comments: jsonb().$type<CommentRecord[]>().notNull().default([]),
  // Used for ordering (newest first)
  insertedAt: timestamp('inserted_at').notNull().defaultNow(),
});

export const users = pgTable('users', {
  accountKey: text('account_key').primaryKey(), // stored lowercased/trimmed
  displayKey: text('display_key').notNull(),
  name: text().notNull(),
  email: text().notNull().default(''),
  avatarUrl: text('avatar_url').notNull().default('logo.png'),
  notificationsEnabled: integer('notifications_enabled').notNull().default(1),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const settings = pgTable('settings', {
  key: text().primaryKey(),
  value: text().notNull(),
});
