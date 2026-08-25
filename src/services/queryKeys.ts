/**
 * Central React Query key factory. Keeping keys in one place avoids typos
 * that silently break cache invalidation across features.
 */
export const queryKeys = {
  auth: {
    me: ["auth", "me"] as const,
  },
  users: {
    detail: (username: string) => ["users", "detail", username] as const,
    search: (query: string) => ["users", "search", query] as const,
    suggestions: ["users", "suggestions"] as const,
    followers: (userId: string) => ["users", userId, "followers"] as const,
    following: (userId: string) => ["users", userId, "following"] as const,
    followRequests: ["users", "me", "follow-requests"] as const,
  },
  posts: {
    feed: ["posts", "feed"] as const,
    explore: ["posts", "explore"] as const,
    byUser: (userId: string) => ["posts", "user", userId] as const,
    detail: (postId: string) => ["posts", "detail", postId] as const,
  },
  comments: {
    list: (postId: string) => ["comments", postId] as const,
    replies: (commentId: string) => ["comments", "replies", commentId] as const,
  },
  stories: {
    feed: ["stories", "feed"] as const,
    byUser: (userId: string) => ["stories", "user", userId] as const,
    viewers: (storyId: string) => ["stories", "viewers", storyId] as const,
    archive: ["stories", "archive"] as const,
  },
  music: {
    trending: ["music", "trending"] as const,
    search: (query: string) => ["music", "search", query] as const,
  },
  conversations: {
    list: ["conversations"] as const,
    messages: (conversationId: string) =>
      ["conversations", conversationId, "messages"] as const,
  },
  notifications: {
    list: ["notifications"] as const,
  },
} as const;
