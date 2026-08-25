import { api, toFormData } from "@/lib/axios";
import type {
  ArchivedStory,
  AuthResponse,
  CallAnswerResult,
  CallEndSummary,
  CallSession,
  CallType,
  Comment,
  Conversation,
  ConversationJoinRequest,
  LoginPayload,
  Message,
  MusicTrack,
  Note,
  Notification,
  PaginatedResponse,
  Post,
  RegisterPayload,
  Story,
  StoryGroup,
  User,
  UserSummary,
} from "@/types";

/** ------------------------------------------------------------------ */
/** Auth                                                                */
/** ------------------------------------------------------------------ */

export const authApi = {
  login: (payload: LoginPayload) =>
    api.post<AuthResponse>("/auth/login", payload).then((res) => res.data),

  register: (payload: RegisterPayload) =>
    api.post<AuthResponse>("/auth/register", payload).then((res) => res.data),

  logout: () => api.post<void>("/auth/logout").then((res) => res.data),
};

/** ------------------------------------------------------------------ */
/** Users                                                               */
/** ------------------------------------------------------------------ */

export const usersApi = {
  /** There's no `/auth/me` on this backend — `/users/me` is the equivalent. */
  me: () => api.get<User>("/users/me").then((res) => res.data),

  getById: (userId: string) =>
    api.get<User>(`/users/${userId}`).then((res) => res.data),

  /**
   * The backend only looks users up by Mongo ObjectId (`GET /users/:userId`),
   * there's no lookup-by-username route. We resolve the username to an id
   * via `/users/search` first (it matches on username/fullName), then fetch
   * the full profile by that id.
   */
  getByUsername: async (username: string): Promise<User> => {
    const { data } = await api.get<PaginatedResponse<UserSummary>>(
      "/users/search",
      { params: { q: username, limit: 5 } },
    );
    const match = data.items.find(
      (user) => user.username.toLowerCase() === username.toLowerCase(),
    );
    if (!match) {
      throw new Error(`No user found with username "${username}"`);
    }
    return usersApi.getById(match.id);
  },

  search: (query: string) =>
    api
      .get<PaginatedResponse<UserSummary>>("/users/search", {
        params: { q: query, limit: 10 },
      })
      .then((res) => res.data.items),

  suggestions: () =>
    api.get<UserSummary[]>("/users/suggestions").then((res) => res.data),

  follow: (userId: string) =>
    api
      .post<{ status: "accepted" | "pending" }>(`/users/${userId}/follow`)
      .then((res) => res.data),

  /** Also cancels an outstanding follow *request* to a private account. */
  unfollow: (userId: string) =>
    api.delete<void>(`/users/${userId}/follow`).then((res) => res.data),

  /** Incoming follow requests on the current (private) user's account. */
  followRequests: () =>
    api.get<UserSummary[]>("/users/me/follow-requests").then((res) => res.data),

  acceptFollowRequest: (requesterId: string) =>
    api
      .post<void>(`/users/me/follow-requests/${requesterId}/accept`)
      .then((res) => res.data),

  rejectFollowRequest: (requesterId: string) =>
    api
      .post<void>(`/users/me/follow-requests/${requesterId}/reject`)
      .then((res) => res.data),

  followers: (userId: string, page?: number) =>
    api
      .get<PaginatedResponse<UserSummary>>(`/users/${userId}/followers`, {
        params: { page },
      })
      .then((res) => res.data),

  following: (userId: string, page?: number) =>
    api
      .get<PaginatedResponse<UserSummary>>(`/users/${userId}/following`, {
        params: { page },
      })
      .then((res) => res.data),

  updateProfile: (
    payload: Partial<Pick<User, "fullName" | "bio" | "website" | "isPrivate">>,
  ) => api.patch<User>("/users/me", payload).then((res) => res.data),

  updateAvatar: (file: File) =>
    api
      .post<{ avatarUrl: string }>(
        "/users/me/avatar",
        toFormData({ file }),
        { headers: { "Content-Type": "multipart/form-data" } },
      )
      .then((res) => res.data),

  /**
   * Blocking is one-directional visibility, not mutual: it hides *you* from
   * the person you block (their profile/posts/stories/search all 404 or
   * come back empty for them), but you can still see and unblock them
   * yourself — same as Instagram. See insta_Back's `isBlockedByTarget`.
   */
  block: (userId: string) =>
    api.post<void>(`/users/${userId}/block`).then((res) => res.data),

  unblock: (userId: string) =>
    api.delete<void>(`/users/${userId}/block`).then((res) => res.data),

  /** Every account the current user has blocked. */
  blocked: () =>
    api.get<UserSummary[]>("/users/me/blocked").then((res) => res.data),

  /** Every post the current user has saved — the real source of truth for
   * the Saved page (see `postsApi.save`/`.unsave` for the toggle itself). */
  saved: (page?: number) =>
    api
      .get<PaginatedResponse<Post>>("/users/me/saved", { params: { page } })
      .then((res) => res.data),

  /**
   * "Hide story from" — one-directional and author-controlled, unlike
   * `block`: the hidden person keeps seeing everything else of yours, just
   * never your stories. See `insta_Back`'s `isHiddenFromStories`.
   */
  storyHidden: () =>
    api.get<UserSummary[]>("/users/me/story-hidden").then((res) => res.data),

  hideStoryFrom: (userId: string) =>
    api.post<void>(`/users/${userId}/story-hidden`).then((res) => res.data),

  unhideStoryFrom: (userId: string) =>
    api.delete<void>(`/users/${userId}/story-hidden`).then((res) => res.data),
};

/** ------------------------------------------------------------------ */
/** Posts                                                               */
/** ------------------------------------------------------------------ */

export interface CreatePostPayload {
  images: File[];
  caption?: string;
  location?: string;
}

export const postsApi = {
  feed: (page?: number) =>
    api
      .get<PaginatedResponse<Post>>("/posts/feed", { params: { page } })
      .then((res) => res.data),

  explore: (page?: number) =>
    api
      .get<PaginatedResponse<Post>>("/posts/explore", { params: { page } })
      .then((res) => res.data),

  byUser: (userId: string, page?: number) =>
    api
      .get<PaginatedResponse<Post>>(`/users/${userId}/posts`, {
        params: { page },
      })
      .then((res) => res.data),

  get: (postId: string) =>
    api.get<Post>(`/posts/${postId}`).then((res) => res.data),

  create: (payload: CreatePostPayload) =>
    api
      .post<Post>(
        "/posts",
        toFormData({
          media: payload.images,
          caption: payload.caption,
          location: payload.location,
        }),
        { headers: { "Content-Type": "multipart/form-data" } },
      )
      .then((res) => res.data),

  delete: (postId: string) =>
    api.delete<void>(`/posts/${postId}`).then((res) => res.data),

  like: (postId: string) =>
    api.post<void>(`/posts/${postId}/like`).then((res) => res.data),

  unlike: (postId: string) =>
    api.delete<void>(`/posts/${postId}/like`).then((res) => res.data),

  save: (postId: string) =>
    api.post<void>(`/posts/${postId}/save`).then((res) => res.data),

  unsave: (postId: string) =>
    api.delete<void>(`/posts/${postId}/save`).then((res) => res.data),
};

/** ------------------------------------------------------------------ */
/** Comments                                                            */
/** ------------------------------------------------------------------ */

export const commentsApi = {
  /** Top-level comments only — the backend never nests replies inline. */
  list: (postId: string, page?: number) =>
    api
      .get<PaginatedResponse<Comment>>(`/posts/${postId}/comments`, {
        params: { page },
      })
      .then((res) => res.data),

  replies: (commentId: string, page?: number) =>
    api
      .get<PaginatedResponse<Comment>>(`/comments/${commentId}/replies`, {
        params: { page },
      })
      .then((res) => res.data),

  create: (postId: string, text: string, parentCommentId?: string) =>
    api
      .post<Comment>(`/posts/${postId}/comments`, { text, parentCommentId })
      .then((res) => res.data),

  delete: (commentId: string) =>
    api.delete<void>(`/comments/${commentId}`).then((res) => res.data),

  like: (commentId: string) =>
    api.post<void>(`/comments/${commentId}/like`).then((res) => res.data),

  unlike: (commentId: string) =>
    api.delete<void>(`/comments/${commentId}/like`).then((res) => res.data),
};

/** ------------------------------------------------------------------ */
/** Stories                                                             */
/** ------------------------------------------------------------------ */

export const storiesApi = {
  /** Active stories from people you follow, grouped by author. */
  feed: () => api.get<StoryGroup[]>("/stories/feed").then((res) => res.data),

  byUser: (userId: string) =>
    api.get<Story[]>(`/users/${userId}/stories`).then((res) => res.data),

  /**
   * Upload a story, optionally with a caption (+ where it was dragged to)
   * and/or a music sticker. The backend expects the track as a JSON
   * *string* field alongside the multipart file — it can't carry a nested
   * object through form-data; the caption position is two separate number
   * fields for the same reason.
   */
  create: (
    file: File,
    options?: {
      music?: MusicTrack | null;
      caption?: string;
      captionPosition?: { x: number; y: number } | null;
    },
  ) =>
    api
      .post<Story>(
        "/stories",
        toFormData({
          media: file,
          ...(options?.caption ? { caption: options.caption } : {}),
          ...(options?.music
            ? { music: JSON.stringify(options.music) }
            : {}),
          ...(options?.caption && options?.captionPosition
            ? {
                captionX: options.captionPosition.x,
                captionY: options.captionPosition.y,
              }
            : {}),
        }),
        { headers: { "Content-Type": "multipart/form-data" } },
      )
      .then((res) => res.data),

  delete: (storyId: string) =>
    api.delete<void>(`/stories/${storyId}`).then((res) => res.data),

  markViewed: (storyId: string) =>
    api.post<void>(`/stories/${storyId}/view`).then((res) => res.data),

  like: (storyId: string) =>
    api.post<void>(`/stories/${storyId}/like`).then((res) => res.data),

  /** Author-only — who has watched this story. */
  viewers: (storyId: string) =>
    api.get<UserSummary[]>(`/stories/${storyId}/viewers`).then((res) => res.data),

  /** Author-only — every story ever posted, active or expired. */
  archive: () =>
    api.get<ArchivedStory[]>("/stories/me/archive").then((res) => res.data),
};

/** ------------------------------------------------------------------ */
/** Direct messages / conversations                                    */
/** ------------------------------------------------------------------ */

export const conversationsApi = {
  list: (page?: number) =>
    api
      .get<PaginatedResponse<Conversation>>("/conversations", {
        params: { page },
      })
      .then((res) => res.data),

  /**
   * There's no `GET /conversations/:id` — creating with the same
   * participant set just returns the existing conversation (exact-match, so
   * [a,b] and [a,b,c] never collide), so this doubles as "get or create" —
   * for a 1:1 thread with one id, or a group with more than one.
   */
  getOrCreateWithUser: (userId: string) =>
    api
      .post<Conversation>("/conversations", { participantIds: [userId] })
      .then((res) => res.data),

  createGroup: (participantIds: string[]) =>
    api
      .post<Conversation>("/conversations", { participantIds })
      .then((res) => res.data),

  rename: (conversationId: string, name: string) =>
    api
      .patch<Conversation>(`/conversations/${conversationId}`, { name })
      .then((res) => res.data),

  /** Leaving a 1:1 is rejected server-side — "delete" (client-side hide,
   * see `useConversationPrefsStore`) is what that's for. */
  leave: (conversationId: string) =>
    api.delete<void>(`/conversations/${conversationId}/leave`).then((res) => res.data),

  promoteAdmin: (conversationId: string, userId: string) =>
    api
      .post<void>(`/conversations/${conversationId}/admins/${userId}`)
      .then((res) => res.data),

  demoteAdmin: (conversationId: string, userId: string) =>
    api
      .delete<void>(`/conversations/${conversationId}/admins/${userId}`)
      .then((res) => res.data),

  /** Sets *my own* private label for that participant — see `Conversation.nicknames`. */
  setNickname: (conversationId: string, userId: string, nickname: string) =>
    api
      .put<void>(`/conversations/${conversationId}/nicknames/${userId}`, { nickname })
      .then((res) => res.data),

  clearNickname: (conversationId: string, userId: string) =>
    api
      .delete<void>(`/conversations/${conversationId}/nicknames/${userId}`)
      .then((res) => res.data),

  /**
   * An admin (or anyone, while it's still just a 1:1) adds directly and
   * resolves with `{ pending: false, conversation }`; a non-admin member of
   * an established group instead files a join request and resolves with
   * `{ pending: true, request }` for the admin(s) to act on.
   */
  addMember: (conversationId: string, userId: string) =>
    api
      .post<
        | { pending: false; conversation: Conversation }
        | { pending: true; request: ConversationJoinRequest }
      >(`/conversations/${conversationId}/members`, { userId })
      .then((res) => res.data),

  joinRequests: (conversationId: string) =>
    api
      .get<ConversationJoinRequest[]>(`/conversations/${conversationId}/join-requests`)
      .then((res) => res.data),

  /** Admin-only server-side. */
  acceptJoinRequest: (conversationId: string, requestId: string) =>
    api
      .post<void>(`/conversations/${conversationId}/join-requests/${requestId}/accept`)
      .then((res) => res.data),

  /** Admin rejects, or the requester cancels their own — same endpoint,
   * enforced server-side. */
  rejectJoinRequest: (conversationId: string, requestId: string) =>
    api
      .delete<void>(`/conversations/${conversationId}/join-requests/${requestId}`)
      .then((res) => res.data),

  messages: (conversationId: string, page?: number) =>
    api
      .get<PaginatedResponse<Message>>(
        `/conversations/${conversationId}/messages`,
        { params: { page } },
      )
      .then((res) => res.data),

  sendMessage: (
    conversationId: string,
    payload: { text?: string; mediaUrl?: string; postId?: string },
  ) =>
    api
      .post<Message>(`/conversations/${conversationId}/messages`, payload)
      .then((res) => res.data),
};

export const messagesApi = {
  /** Per-message read receipt — there's no bulk "mark conversation read". */
  markRead: (messageId: string) =>
    api.post<void>(`/messages/${messageId}/read`).then((res) => res.data),

  delete: (messageId: string) =>
    api.delete<void>(`/messages/${messageId}`).then((res) => res.data),
};

/** ------------------------------------------------------------------ */
/** Calls (audio/video)                                                 */
/** ------------------------------------------------------------------ */

/**
 * These endpoints only *persist* a call — none of them signal anyone. Ringing
 * the other party, accept/reject/end and the SDP/ICE exchange all travel over
 * the "/chat" socket ("call:initiate" and friends); see `CallProvider`. The
 * ids are not interchangeable either: `callId` here is the Prisma row id,
 * while the socket mints its own id for the signalling.
 */
export const callsApi = {
  /** Writes the "ringing" row. Returns it as `callId`, not `id`. */
  start: (chatId: string, type: CallType) =>
    api
      .post<CallSession>(`/chats/${chatId}/calls`, { type })
      .then((res) => res.data),

  /** Records the outcome. Any participant may write it, not just the callee —
   * which is what lets the caller keep the row up to date. */
  answer: (callId: string, action: "accept" | "reject") =>
    api
      .post<CallAnswerResult>(`/calls/${callId}/answer`, { action })
      .then((res) => res.data),

  end: (callId: string) =>
    api.post<CallEndSummary>(`/calls/${callId}/end`).then((res) => res.data),
};

/** ------------------------------------------------------------------ */
/** Notifications                                                       */
/** ------------------------------------------------------------------ */

export const notificationsApi = {
  list: (page?: number) =>
    api
      .get<PaginatedResponse<Notification>>("/notifications", {
        params: { page },
      })
      .then((res) => res.data),

  markRead: (notificationId: string) =>
    api
      .post<void>(`/notifications/${notificationId}/read`)
      .then((res) => res.data),

  markAllRead: () =>
    api.post<void>("/notifications/read-all").then((res) => res.data),
};

/** ------------------------------------------------------------------ */
/** Notes                                                               */
/** ------------------------------------------------------------------ */

export const notesApi = {
  /** My note plus one from each person I follow (mine first). */
  list: () => api.get<Note[]>("/notes").then((res) => res.data),

  /** Create or replace my note (one per user). */
  create: (payload: { text: string; music?: MusicTrack | null }) =>
    api.post<Note>("/notes", payload).then((res) => res.data),

  /** Remove my note. */
  remove: () => api.delete<void>("/notes").then((res) => res.data),
};

/** ------------------------------------------------------------------ */
/** Music                                                               */
/** ------------------------------------------------------------------ */

export const musicApi = {
  /** The curated catalogue shown in the picker — `src/data/topTracks.json`
   * on the backend, so it needs no network call out to Apple. */
  trending: (limit?: number) =>
    api
      .get<{ items: MusicTrack[] }>("/music/trending", { params: { limit } })
      .then((res) => res.data.items),

  /**
   * Search the catalogue for stories and notes. The backend fronts Apple's
   * iTunes Search API and only returns tracks that actually have a preview
   * clip, so every result here is playable.
   */
  search: (query: string, limit = 25) =>
    api
      .get<{ items: MusicTrack[] }>("/music/search", {
        params: { q: query, limit },
      })
      .then((res) => res.data.items),
};

/** ------------------------------------------------------------------ */
/** Media                                                               */
/** ------------------------------------------------------------------ */

export const mediaApi = {
  upload: (file: File) =>
    api
      .post<{ url: string; mediaType: "image" | "video" }>(
        "/media/upload",
        toFormData({ file }),
        { headers: { "Content-Type": "multipart/form-data" } },
      )
      .then((res) => res.data),
};
