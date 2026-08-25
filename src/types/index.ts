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
  /** Whether *you've* blocked this user (not the reverse — if they'd blocked
   * you, this profile would never have loaded in the first place). */
  isBlockedByMe: boolean;
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

/**
 * A song from `GET /music/search`. The backend proxies Apple's iTunes Search
 * API and normalises each row into this shape, so the frontend never sees
 * Apple's own field names. `previewUrl` is a ~30s clip.
 */
export interface MusicTrack {
  trackId: string;
  title: string;
  artist: string;
  album?: string;
  artworkUrl: string | null;
  previewUrl: string | null;
  durationMs?: number | null;
}

export interface Story {
  id: string;
  author: UserSummary;
  mediaUrl: string;
  mediaType: "image" | "video";
  caption: string;
  /** The music sticker attached at upload time, or null. */
  music: MusicTrack | null;
  viewsCount: number;
  isViewedByMe: boolean;
  likesCount: number;
  isLikedByMe: boolean;
  createdAt: string;
  expiresAt: string;
}

export interface StoryGroup {
  user: UserSummary;
  stories: Story[];
}

/**
 * `GET /stories/me/archive` — every story the signed-in user has ever
 * posted, active or expired (nothing is deleted once it expires anymore).
 * No `author`/viewer fields: it's always your own stories, and the archive
 * is about your content, not who watched it.
 */
export interface ArchivedStory {
  id: string;
  mediaUrl: string;
  mediaType: "image" | "video";
  caption: string;
  likesCount: number;
  isExpired: boolean;
  createdAt: string;
  expiresAt: string;
}

export interface ConversationParticipant extends UserSummary {
  /** Only meaningful for a group (>2 participants) — see `isGroupConversation`. */
  isAdmin: boolean;
}

export interface Conversation {
  id: string;
  /** Custom group name. Null for a 1:1, or a group that never set one —
   * fall back to `conversationTitle()`. */
  name: string | null;
  participants: ConversationParticipant[];
  /** My own private nicknames for other participants, forUserId -> label.
   * Never broadcast — only I see mine, same idea per other participant. */
  nicknames: Record<string, string>;
  lastMessage: Message | null;
  unreadCount: number;
  updatedAt: string;
}

/** A non-admin member's pending proposal to add someone to a group — see
 * `conversationsApi.addMember` / `.joinRequests`. */
export interface ConversationJoinRequest {
  id: string;
  conversationId: string;
  requestedBy: UserSummary;
  targetUser: UserSummary;
  createdAt: string;
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

export type CallType = "audio" | "video";

/** Mirrors the `CallStatus` enum in the backend's prisma schema. */
export type CallStatus =
  | "ringing"
  | "ongoing"
  | "rejected"
  | "missed"
  | "completed";

/** `POST /chats/:chatId/calls` — the persisted call row. The id comes back
 * as `callId` (not `id`) and the caller is a bare id, not an embedded user. */
export interface CallSession {
  callId: string;
  chatId: string;
  callerId: string;
  type: CallType;
  status: CallStatus;
  createdAt: string;
}

/** `POST /calls/:callId/answer` */
export interface CallAnswerResult {
  callId: string;
  status: CallStatus;
}

/** `POST /calls/:callId/end` — `status` is the literal "ended" whatever the
 * row was actually recorded as (completed or missed). */
export interface CallEndSummary {
  callId: string;
  status: "ended";
  duration: number;
  endedAt: string;
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
