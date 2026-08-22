import { api, toFormData } from "@/lib/axios";
import type {
  AuthResponse,
  Comment,
  Conversation,
  LoginPayload,
  Message,
  Notification,
  PaginatedResponse,
  Post,
  RegisterPayload,
  Story,
  StoryGroup,
  User,
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

  me: () => api.get<User>("/auth/me").then((res) => res.data),
};

/** ------------------------------------------------------------------ */
/** Users                                                               */
/** ------------------------------------------------------------------ */

export const usersApi = {
  getByUsername: (username: string) =>
    api.get<User>(`/users/${username}`).then((res) => res.data),

  search: (query: string) =>
    api
      .get<User[]>("/users/search", { params: { q: query } })
      .then((res) => res.data),

  suggestions: () =>
    api.get<User[]>("/users/suggestions").then((res) => res.data),

  follow: (userId: string) =>
    api.post<void>(`/users/${userId}/follow`).then((res) => res.data),

  unfollow: (userId: string) =>
    api.delete<void>(`/users/${userId}/follow`).then((res) => res.data),

  followers: (userId: string) =>
    api.get<User[]>(`/users/${userId}/followers`).then((res) => res.data),

  following: (userId: string) =>
    api.get<User[]>(`/users/${userId}/following`).then((res) => res.data),

  updateProfile: (payload: Partial<Pick<User, "fullName" | "bio" | "website" | "isPrivate">>) =>
    api.patch<User>("/users/me", payload).then((res) => res.data),

  updateAvatar: (file: File) =>
    api
      .patch<User>("/users/me/avatar", toFormData({ avatar: file }), {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((res) => res.data),
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
  feed: (cursor?: string) =>
    api
      .get<PaginatedResponse<Post>>("/posts/feed", { params: { cursor } })
      .then((res) => res.data),

  explore: (cursor?: string) =>
    api
      .get<PaginatedResponse<Post>>("/posts/explore", { params: { cursor } })
      .then((res) => res.data),

  byUser: (userId: string, cursor?: string) =>
    api
      .get<PaginatedResponse<Post>>(`/posts/user/${userId}`, {
        params: { cursor },
      })
      .then((res) => res.data),

  saved: (cursor?: string) =>
    api
      .get<PaginatedResponse<Post>>("/posts/saved", { params: { cursor } })
      .then((res) => res.data),

  get: (postId: string) =>
    api.get<Post>(`/posts/${postId}`).then((res) => res.data),

  create: (payload: CreatePostPayload) =>
    api
      .post<Post>(
        "/posts",
        toFormData({
          images: payload.images,
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
  list: (postId: string, cursor?: string) =>
    api
      .get<PaginatedResponse<Comment>>(`/comments/post/${postId}`, {
        params: { cursor },
      })
      .then((res) => res.data),

  create: (postId: string, text: string, parentId?: string) =>
    api
      .post<Comment>(`/comments/post/${postId}`, { text, parentId })
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
  feed: () => api.get<StoryGroup[]>("/stories/feed").then((res) => res.data),

  byUser: (userId: string) =>
    api.get<Story[]>(`/stories/user/${userId}`).then((res) => res.data),

  create: (file: File) =>
    api
      .post<Story>("/stories", toFormData({ media: file }), {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((res) => res.data),

  delete: (storyId: string) =>
    api.delete<void>(`/stories/${storyId}`).then((res) => res.data),

  markViewed: (storyId: string) =>
    api.post<void>(`/stories/${storyId}/view`).then((res) => res.data),
};

/** ------------------------------------------------------------------ */
/** Direct messages / conversations                                    */
/** ------------------------------------------------------------------ */

export const conversationsApi = {
  list: () => api.get<Conversation[]>("/conversations").then((res) => res.data),

  get: (conversationId: string) =>
    api.get<Conversation>(`/conversations/${conversationId}`).then((res) => res.data),

  getOrCreateWithUser: (userId: string) =>
    api
      .post<Conversation>("/conversations", { userId })
      .then((res) => res.data),

  messages: (conversationId: string, cursor?: string) =>
    api
      .get<PaginatedResponse<Message>>(
        `/conversations/${conversationId}/messages`,
        { params: { cursor } },
      )
      .then((res) => res.data),

  sendMessage: (conversationId: string, text: string) =>
    api
      .post<Message>(`/conversations/${conversationId}/messages`, { text })
      .then((res) => res.data),

  markRead: (conversationId: string) =>
    api
      .post<void>(`/conversations/${conversationId}/read`)
      .then((res) => res.data),
};

/** ------------------------------------------------------------------ */
/** Notifications                                                       */
/** ------------------------------------------------------------------ */

export const notificationsApi = {
  list: (cursor?: string) =>
    api
      .get<PaginatedResponse<Notification>>("/notifications", {
        params: { cursor },
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
/** Media                                                               */
/** ------------------------------------------------------------------ */

export const mediaApi = {
  upload: (file: File) =>
    api
      .post<{ url: string }>("/media/upload", toFormData({ file }), {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((res) => res.data),
};
