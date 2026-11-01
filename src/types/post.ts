export interface CommentItem {
  id: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  createdAt: string;
  likes: number;
  likedBy: string[]; // IP or local user identifiers
}

export interface FileAttachment {
  name: string;
  type: string; // 'image' | 'video' | 'file'
  dataUrl: string;
  sizeFormatted: string;
}

export interface PostItem {
  id: string;
  category: 'News' | 'Update';
  title: string;
  description?: string;
  attachment?: FileAttachment;
  authorName: string;
  authorAvatar: string;
  createdAt: string;
  likes: number;
  likedBy: string[];
  shares: number;
  comments: CommentItem[];
}
