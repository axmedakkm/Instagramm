import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/services/queryKeys";
import type { PaginatedResponse, Post } from "@/types";

/** Applies an optimistic patch to every feed-like paginated post query in
 * the cache so a like/save/comment toggled anywhere is reflected everywhere. */
export function patchPostInCaches(
  queryClient: QueryClient,
  postId: string,
  patch: (post: Post) => Post,
) {
  const queryKeysToPatch = [queryKeys.posts.feed, queryKeys.posts.explore];

  queryKeysToPatch.forEach((key) => {
    queryClient.setQueriesData<
      { pages: PaginatedResponse<Post>[] } | PaginatedResponse<Post>
    >({ queryKey: key }, (old) => {
      if (!old) return old;
      const patchPage = (page: PaginatedResponse<Post>) => ({
        ...page,
        items: page.items.map((item) =>
          item.id === postId ? patch(item) : item,
        ),
      });
      if ("pages" in old) {
        return { ...old, pages: old.pages.map(patchPage) };
      }
      return patchPage(old);
    });
  });

  queryClient.setQueryData<Post>(queryKeys.posts.detail(postId), (old) =>
    old ? patch(old) : old,
  );
}
