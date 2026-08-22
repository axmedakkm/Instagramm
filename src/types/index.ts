/**
 * Shared domain types for the Instagram clone frontend.
 * These mirror the shapes returned by the backend REST API
 * (see AGENTS.md / project README for the Swagger reference).
 */

export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  bio: string | null;
  website: string | null;
  isPrivate: boolean;
  isVerified: boolean;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  isFollowedByMe: boolean;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse extends AuthTokens {
  user: User;
}

export interface LoginPayload {
  identifier: string; // email or username
  password: string;
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  fullName: string;
}

export interface MediaAsset {
  id: string;
  url: string;
  width: number | null;
  height: number | null;
  type: "image" | "video";
}

export interface Post {
  id: string;
  author: User;
  caption: string | null;
  location: string | null;
  media: MediaAsset[];
  likesCount: number;
  commentsCount: number;
  isLikedByMe: boolean;
  isSavedByMe: boolean;
  createdAt: string;
}

export interface Comment {
  id: string;
  postId: string;
  author: User;
  text: string;
  likesCount: number;
  isLikedByMe: boolean;
  parentId: string | null;
  replies?: Comment[];
  createdAt: string;
}

export interface Story {
  id: string;
  author: User;
  mediaUrl: string;
  mediaType: "image" | "video";
  viewed: boolean;
  createdAt: string;
  expiresAt: string;
}

export interface StoryGroup {
  user: User;
  stories: Story[];
  hasUnviewed: boolean;
}

export interface Conversation {
  id: string;
  participants: User[];
  lastMessage: Message | null;
  unreadCount: number;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  sender: User;
  text: string | null;
  mediaUrl: string | null;
  isRead: boolean;
  createdAt: string;
}

export type NotificationType =
  | "like"
  | "comment"
  | "follow"
  | "follow_request"
  | "mention";

export interface Notification {
  id: string;
  type: NotificationType;
  actor: User;
  post?: Pick<Post, "id" | "media"> | null;
  isRead: boolean;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface ApiError {
  message: string;
  statusCode: number;
  errors?: Record<string, string[]>;
}
