/**
 * Shared domain types for the Instagram clone frontend.
 *
 * These mirror the ACTUAL response shapes of the backend at
 * `insta_Back/src/utils/serializers.js` — verified against that source,
 * not just the Swagger doc. Two things to keep in mind:
 *
 * 1. Most list endpoints are page-based (`{ items, pagination }`), not
 *    cursor-based — see `PaginatedResponse`.
 * 2. The backend has a "short" user shape (`toUserShort`) embedded almost
 *    everywhere (post authors, comment authors, notification actors, story
 *    authors, message senders), and a "full" shape (`toUser`) only for
 *    `/auth/*`, `/users/me`, and `/users/:userId`. `UserSummary` vs `User`
 *    (which extends it) models that distinction so components don't assume
 *    fields like `isFollowedByMe` exist where the backend never sends them.
 */

export interface UserSummary {
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  isVerified: boolean;
}

export interface User extends UserSummary {
  email: string;
  bio: string;
  website: string;
  isPrivate: boolean;
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
  /** Email or username — the backend field is literally called `login`. */
  login: string;
  password: string;
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  fullName: string;
}

export type MediaType = "image" | "video" | "carousel";

export interface Post {
  id: string;
  author: UserSummary;
  caption: string;
  mediaType: MediaType;
  mediaUrls: string[];
  location: string;
  likesCount: number;
  commentsCount: number;
  isLikedByMe: boolean;
  isSavedByMe: boolean;
  disableComments: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  postId: string;
  author: UserSummary;
  text: string;
  parentCommentId: string | null;
  likesCount: number;
  /** Reply count only — fetch `GET /comments/:id/replies` to load them. */
  repliesCount: number;
  isLikedByMe: boolean;
  createdAt: string;
}

export interface Story {
  id: string;
  author: UserSummary;
  mediaUrl: string;
  mediaType: "image" | "video";
  caption: string;
  viewsCount: number;
  isViewedByMe: boolean;
  createdAt: string;
  expiresAt: string;
}

export interface StoryGroup {
  user: UserSummary;
  stories: Story[];
}

export interface Conversation {
  id: string;
  participants: UserSummary[];
  lastMessage: Message | null;
  unreadCount: number;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  sender: UserSummary;
  text: string;
  mediaUrl: string | null;
  sharedPostId: string | null;
  isRead: boolean;
  createdAt: string;
}

export type NotificationType =
  | "like_post"
  | "like_comment"
  | "comment"
  | "follow"
  | "follow_request"
  | "mention";

export interface Notification {
  id: string;
  type: NotificationType;
  actor: UserSummary;
  postId: string | null;
  commentId: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PageMeta;
}

export interface ApiError {
  message: string;
  code: string;
}
