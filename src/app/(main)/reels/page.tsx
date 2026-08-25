"use client";

import { useQuery } from "@tanstack/react-query";
import { Film } from "lucide-react";
import { useState } from "react";
import { ReelCard } from "@/components/reels/ReelCard";
import { Skeleton } from "@/components/ui/skeleton";
import { postsApi } from "@/services/api";
import { queryKeys } from "@/services/queryKeys";

/**
 * A vertical, snap-scrolling feed. Video media renders as a looping muted
 * `<video>`; image-only posts render as a full-bleed photo. There's no
 * dedicated `/reels` backend endpoint, so this reuses the explore feed.
 */
export default function ReelsPage() {
  // Mute lives here, not in each ReelCard: unmuting one reel should carry
  // over as you scroll to the next, the way it does in the real app.
  const [isMuted, setIsMuted] = useState(true);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.posts.explore,
    queryFn: () => postsApi.explore(),
  });

  const posts = data?.items ?? [];

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background px-3">
        <div className="flex h-full max-h-[94vh] items-end gap-3 py-4">
          <Skeleton className="h-full rounded-2xl [aspect-ratio:9/16]" />
          <div className="flex flex-col gap-5 pb-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="size-7 rounded-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <div className="grid size-16 place-items-center rounded-full border-2 border-foreground">
          <Film className="size-7" />
        </div>
        <p className="text-xl font-light">No reels yet</p>
        <p className="max-w-xs text-sm text-muted-foreground">
          When people post videos, they&apos;ll play here.
        </p>
      </div>
    );
  }

  return (
    <div className="no-scrollbar h-screen snap-y snap-mandatory overflow-y-scroll bg-background">
      {posts.map((post) => (
        <ReelCard
          key={post.id}
          post={post}
          isMuted={isMuted}
          onToggleMute={() => setIsMuted((muted) => !muted)}
        />
      ))}
    </div>
  );
}
