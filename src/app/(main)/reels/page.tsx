"use client";

import { useQuery } from "@tanstack/react-query";
import { Heart, MessageCircle, Volume2, VolumeX } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { CommentSheet } from "@/components/feed/CommentSheet";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Skeleton } from "@/components/ui/skeleton";
import { postsApi } from "@/services/api";
import { queryKeys } from "@/services/queryKeys";
import type { Post } from "@/types";

/**
 * A vertical, snap-scrolling feed built on top of `/posts/explore`. Video
 * media renders as a looping, mutable `<video>`; image-only posts render as
 * a static full-bleed photo. There is no dedicated `/reels` backend
 * endpoint in the spec, so this reuses the explore feed as its source.
 */
export default function ReelsPage() {
  const [isMuted, setIsMuted] = useState(true);
  // The reel whose comment sheet is open. Kept as the post itself so the sheet
  // still has a count to show while it slides back down on close.
  const [commentsFor, setCommentsFor] = useState<Post | null>(null);
  const [commentsOpen, setCommentsOpen] = useState(false);

  const openComments = (post: Post) => {
    setCommentsFor(post);
    setCommentsOpen(true);
  };

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.posts.explore,
    queryFn: () => postsApi.explore(),
  });

  const posts = data?.items ?? [];

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Skeleton className="h-[80vh] w-[380px]" />
      </div>
    );
  }

  return (
    <div className="no-scrollbar h-screen snap-y snap-mandatory overflow-y-scroll">
      {posts.map((post) => {
        const mediaUrl = post.mediaUrls[0];
        return (
          <section
            key={post.id}
            className="relative flex h-screen w-full snap-start items-center justify-center bg-black"
          >
            <div className="relative h-full max-h-screen w-full max-w-md">
              {post.mediaType === "video" ? (
                <video
                  src={mediaUrl}
                  autoPlay
                  loop
                  muted={isMuted}
                  playsInline
                  className="h-full w-full object-contain"
                />
              ) : (
                <Image
                  src={mediaUrl ?? ""}
                  alt={post.caption || "Reel"}
                  fill
                  className="object-contain"
                />
              )}

              <button
                type="button"
                onClick={() => setIsMuted((prev) => !prev)}
                className="absolute right-4 top-4 rounded-full bg-black/50 p-2 text-white"
              >
                {isMuted ? (
                  <VolumeX className="size-4" />
                ) : (
                  <Volume2 className="size-4" />
                )}
              </button>

              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/70 to-transparent p-4 text-white">
                <div className="min-w-0">
                  <Link
                    href={`/${post.author.username}`}
                    className="flex items-center gap-2"
                  >
                    <UserAvatar user={post.author} size="sm" />
                    <span className="text-sm font-semibold">
                      {post.author.username}
                    </span>
                  </Link>
                  {post.caption && (
                    <p className="mt-2 line-clamp-2 text-sm">{post.caption}</p>
                  )}
                </div>

                <div className="flex flex-col items-center gap-4">
                  <Link
                    href={`/p/${post.id}`}
                    className="flex flex-col items-center gap-1"
                  >
                    <Heart
                      className={post.isLikedByMe ? "size-7 fill-destructive text-destructive" : "size-7"}
                    />
                    <span className="text-xs">{post.likesCount}</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => openComments(post)}
                    className="flex flex-col items-center gap-1 transition-transform duration-200 ease-spring hover:scale-110 active:scale-90"
                    aria-label="Comments"
                  >
                    <MessageCircle className="size-7 -scale-x-100" />
                    <span className="text-xs">{post.commentsCount}</span>
                  </button>
                </div>
              </div>
            </div>
          </section>
        );
      })}

      {posts.length === 0 && (
        <div className="flex h-screen items-center justify-center text-sm text-muted-foreground">
          No reels to show right now.
        </div>
      )}

      {commentsFor && (
        <CommentSheet
          postId={commentsFor.id}
          commentsCount={commentsFor.commentsCount}
          open={commentsOpen}
          onOpenChange={setCommentsOpen}
        />
      )}
    </div>
  );
}
