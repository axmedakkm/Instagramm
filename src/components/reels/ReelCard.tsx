"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bookmark, Heart, MessageCircle, Send, Volume2, VolumeX } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CommentSheet } from "@/components/feed/CommentSheet";
import { SharePostModal } from "@/components/feed/SharePostModal";
import { QuickFollowButton } from "@/components/shared/QuickFollowButton";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { patchPostInCaches } from "@/lib/postCache";
import { cn } from "@/lib/utils";
import { postsApi } from "@/services/api";
import { useAuthStore } from "@/store/useAuthStore";
import { useSavedPostsStore } from "@/store/useSavedPostsStore";
import type { Post } from "@/types";

/**
 * One full-screen reel: the video on the left, the action rail on its right.
 *
 * This is its own component rather than JSX inside the page's `.map()`
 * because every reel needs its own hooks — a like mutation, a comment sheet,
 * a share modal. Hooks can't live inside a loop, so the loop has to render
 * components.
 */
export function ReelCard({
  post,
  isMuted,
  onToggleMute,
}: {
  post: Post;
  isMuted: boolean;
  onToggleMute: () => void;
}) {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const videoRef = useRef<HTMLVideoElement>(null);
  const sectionRef = useRef<HTMLElement>(null);

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const isSaved = useSavedPostsStore((state) =>
    state.posts.some((p) => p.id === post.id),
  );
  const toggleSaved = useSavedPostsStore((state) => state.toggle);

  // Only the reel on screen plays. Without this every video in the list
  // autoplays at once, which burns CPU and stacks audio the moment you unmute.
  useEffect(() => {
    const section = sectionRef.current;
    const video = videoRef.current;
    if (!section || !video) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) video.play().catch(() => {});
        else video.pause();
      },
      { threshold: 0.6 },
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  const likeMutation = useMutation({
    mutationFn: () =>
      post.isLikedByMe ? postsApi.unlike(post.id) : postsApi.like(post.id),
    onMutate: () => {
      patchPostInCaches(queryClient, post.id, (item) => ({
        ...item,
        isLikedByMe: !item.isLikedByMe,
        likesCount: item.isLikedByMe
          ? item.likesCount - 1
          : item.likesCount + 1,
      }));
    },
    onError: () => {
      patchPostInCaches(queryClient, post.id, (item) => ({
        ...item,
        isLikedByMe: post.isLikedByMe,
        likesCount: post.likesCount,
      }));
      toast.error("Couldn't update like. Please try again.");
    },
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      isSaved ? postsApi.unsave(post.id) : postsApi.save(post.id),
  });

  const handleToggleSave = () => {
    toast.success(isSaved ? "Removed from saved" : "Saved");
    toggleSaved(post);
    saveMutation.mutate();
  };

  const mediaUrl = post.mediaUrls[0];
  const isOwnReel = currentUser?.id === post.author.id;

  return (
    <section
      ref={sectionRef}
      className="flex h-screen w-full snap-start items-center justify-center bg-black px-3"
    >
      {/* Video and rail sit side by side, both aligned to the bottom edge. */}
      <div className="flex h-full max-h-[94vh] items-end gap-3 py-4">
        <div className="relative h-full overflow-hidden rounded-2xl bg-neutral-900 [aspect-ratio:9/16]">
          {post.mediaType === "video" ? (
            <video
              ref={videoRef}
              src={mediaUrl}
              loop
              muted={isMuted}
              playsInline
              className="size-full object-cover"
            />
          ) : (
            <Image
              src={mediaUrl ?? ""}
              alt={post.caption || "Reel"}
              fill
              sizes="(max-width: 640px) 100vw, 420px"
              className="object-cover"
            />
          )}

          {/* Mute toggle, bottom-right inside the video. */}
          <button
            type="button"
            onClick={onToggleMute}
            aria-label={isMuted ? "Unmute" : "Mute"}
            className="glass-media absolute bottom-4 right-4 grid size-9 place-items-center rounded-full text-white transition-transform duration-200 ease-spring hover:scale-110 active:scale-90"
          >
            {isMuted ? (
              <VolumeX className="size-4" />
            ) : (
              <Volume2 className="size-4" />
            )}
          </button>

          {/* Author and caption over a gradient, so white text stays readable
              whatever the frame underneath happens to be. */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pr-16 text-white">
            <div className="flex items-center gap-2.5">
              <Link
                href={`/${post.author.username}`}
                className="flex min-w-0 items-center gap-2"
              >
                <UserAvatar
                  user={post.author}
                  size="sm"
                  className="border border-white/30"
                />
                <span className="truncate text-sm font-semibold">
                  {post.author.username}
                </span>
              </Link>
              {!isOwnReel && (
                <QuickFollowButton
                  userId={post.author.id}
                  className="h-7 shrink-0 rounded-md px-3 text-xs"
                />
              )}
            </div>

            {post.caption && (
              <p className="mt-2 line-clamp-2 text-sm leading-snug">
                {post.caption}
              </p>
            )}
          </div>
        </div>

        {/* Action rail. */}
        <div className="flex shrink-0 flex-col items-center gap-5 pb-4 text-foreground">
          <RailButton
            label={post.isLikedByMe ? "Unlike" : "Like"}
            count={post.likesCount}
            onClick={() => likeMutation.mutate()}
          >
            <Heart
              key={String(post.isLikedByMe)}
              className={cn(
                "size-7",
                post.isLikedByMe &&
                  "animate-like-pop fill-destructive text-destructive",
              )}
            />
          </RailButton>

          <RailButton
            label="Comments"
            count={post.commentsCount}
            onClick={() => setCommentsOpen(true)}
          >
            <MessageCircle className="size-7 -scale-x-100" />
          </RailButton>

          <RailButton label="Share" onClick={() => setShareOpen(true)}>
            <Send className="size-7" />
          </RailButton>

          <RailButton
            label={isSaved ? "Remove from saved" : "Save"}
            onClick={handleToggleSave}
          >
            <Bookmark
              key={String(isSaved)}
              className={cn(
                "size-7",
                isSaved && "animate-like-pop fill-current",
              )}
            />
          </RailButton>
        </div>
      </div>

      <CommentSheet
        postId={post.id}
        commentsCount={post.commentsCount}
        open={commentsOpen}
        onOpenChange={setCommentsOpen}
      />

      <SharePostModal
        postId={post.id}
        open={shareOpen}
        onOpenChange={setShareOpen}
      />
    </section>
  );
}

/**
 * One item in the right-hand rail: an icon with an optional count under it.
 * Share and Save have no number, so `count` is optional.
 */
function RailButton({
  label,
  count,
  onClick,
  children,
}: {
  label: string;
  count?: number;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex flex-col items-center gap-1 transition-transform duration-200 ease-spring hover:scale-110 active:scale-90"
    >
      {children}
      {count !== undefined && (
        <span className="text-xs font-semibold tabular-nums">
          {formatCount(count)}
        </span>
      )}
    </button>
  );
}

/** 999 → "999", 51_300 → "51.3K", 1_200_000 → "1.2M". */
function formatCount(value: number) {
  if (value < 1000) return String(value);
  if (value < 1_000_000) return `${trimZero(value / 1000)}K`;
  return `${trimZero(value / 1_000_000)}M`;
}

function trimZero(value: number) {
  return value.toFixed(1).replace(/\.0$/, "");
}
