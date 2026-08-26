"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Music,
  Send,
  Trash2,
  Volume2,
  VolumeX,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CommentSheet } from "@/components/feed/CommentSheet";
import { MusicTrackAudio } from "@/components/feed/MusicTrackAudio";
import { SharePostModal } from "@/components/feed/SharePostModal";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { TimeAgo } from "@/components/shared/TimeAgo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { patchPostInCaches } from "@/lib/postCache";
import { cn } from "@/lib/utils";
import { postsApi } from "@/services/api";
import { queryKeys } from "@/services/queryKeys";
import { useAuthStore } from "@/store/useAuthStore";

import type { Post } from "@/types";

/** Captions longer than this get clamped behind a "more" toggle, so one
 * essay-length post can't push the next card off the screen. */
const CAPTION_CLAMP_LENGTH = 140;

export function PostCard({ post }: { post: Post }) {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const [mediaIndex, setMediaIndex] = useState(0);
  const [commentsOpen, setCommentsOpen] = useState(false);
  // Only the comment *button* should pop the keyboard; opening the sheet from
  // "view all comments" is a read gesture.
  const [focusComposer, setFocusComposer] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  // Drives the big centre-of-photo heart burst on double-tap. Bumping the key
  // restarts the CSS animation even on rapid repeat taps.
  const [burstKey, setBurstKey] = useState(0);

  // Music sticker playback: starts muted (so autoplay is allowed) and only
  // plays while the media is on screen.
  const hasMusic = !!post.music?.previewUrl;
  const [isMusicMuted, setIsMusicMuted] = useState(true);
  const [musicActive, setMusicActive] = useState(false);
  const mediaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasMusic) return;
    const el = mediaRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => setMusicActive(!!entries[0]?.isIntersecting),
      { threshold: 0.6 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMusic]);

  const isOwner = currentUser?.id === post.author.id;
  const isLongCaption = post.caption.length > CAPTION_CLAMP_LENGTH;

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
      post.isSavedByMe ? postsApi.unsave(post.id) : postsApi.save(post.id),
    onMutate: () => {
      patchPostInCaches(queryClient, post.id, (item) => ({
        ...item,
        isSavedByMe: !item.isSavedByMe,
      }));
    },
    onSuccess: () => {
      toast.success(post.isSavedByMe ? "Removed from saved" : "Saved");
      // The Saved page reads its own list query, not the feed/explore/detail
      // caches `patchPostInCaches` covers — refetch it next time it's open.
      queryClient.invalidateQueries({ queryKey: queryKeys.users.saved });
    },
    onError: () => {
      patchPostInCaches(queryClient, post.id, (item) => ({
        ...item,
        isSavedByMe: post.isSavedByMe,
      }));
      toast.error("Couldn't update saved. Please try again.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => postsApi.delete(post.id),
    onSuccess: () => {
      toast.success("Post deleted");
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.feed });
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.explore });
      queryClient.invalidateQueries({
        queryKey: queryKeys.posts.byUser(post.author.id),
      });
    },
    onError: () => toast.error("Couldn't delete post."),
  });

  const handleDoubleClickLike = () => {
    // The burst plays on every double-tap; the like only fires if not already
    // liked, matching Instagram's behaviour.
    setBurstKey((k) => k + 1);
    if (!post.isLikedByMe) likeMutation.mutate();
  };

  const openComments = (focus: boolean) => {
    setFocusComposer(focus);
    setCommentsOpen(true);
  };

  return (
    <article className="group/card border-b border-border bg-card pb-3 sm:mb-7 sm:overflow-hidden sm:rounded-2xl sm:border sm:border-border/70 sm:shadow-soft sm:transition-all sm:duration-300 sm:ease-smooth sm:hover:-translate-y-0.5 sm:hover:shadow-lifted">
      <header className="flex items-center justify-between px-3.5 py-3 sm:px-4">
        <Link
          href={`/${post.author.username}`}
          className="group/author flex min-w-0 items-center gap-3"
        >
          {/* The gradient hairline reads as the story ring without pretending
              there's an unseen story behind it. */}
          <span className="rounded-full bg-[linear-gradient(135deg,#f9ce34,#ee2a7b,#6228d7)] p-[1.5px] transition-transform duration-200 ease-spring group-hover/author:scale-105">
            <UserAvatar
              user={post.author}
              size="md"
              className="border-2 border-card"
            />
          </span>
          <div className="min-w-0 leading-tight">
            <span className="flex items-center gap-1">
              <span className="truncate text-sm font-semibold transition-colors duration-200 group-hover/author:text-muted-foreground">
                {post.author.username}
              </span>
              {post.author.isVerified && (
                <BadgeCheck className="size-3.5 shrink-0 fill-primary text-card" />
              )}
              <span className="text-xs text-muted-foreground">·</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                <TimeAgo date={post.createdAt} />
              </span>
            </span>
            {post.location && (
              <p className="truncate text-xs text-muted-foreground">
                {post.location}
              </p>
            )}
          </div>
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 shrink-0 rounded-full text-muted-foreground transition-colors hover:text-foreground"
            >
              <MoreHorizontal className="size-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {isOwner && (
              <DropdownMenuItem
                variant="destructive"
                onClick={() => deleteMutation.mutate()}
              >
                <Trash2 className="size-4" />
                Delete post
              </DropdownMenuItem>
            )}
            <DropdownMenuItem asChild>
              <Link href={`/p/${post.id}`}>Go to post</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <div
        ref={mediaRef}
        className="group/media relative aspect-square w-full select-none overflow-hidden bg-muted"
        onDoubleClick={handleDoubleClickLike}
      >
        {post.mediaType === "video" ? (
          <video
            src={post.mediaUrls[0]}
            controls
            loop
            // With a music sticker, the track is the sound — mute the video so
            // the two don't play over each other.
            muted={hasMusic}
            className="size-full object-cover"
          />
        ) : (
          post.mediaUrls.map((url, index) => (
            <Image
              key={url}
              src={url}
              alt={post.caption || `Post by ${post.author.username}`}
              fill
              sizes="(max-width: 640px) 100vw, 470px"
              className={cn(
                "object-cover transition-all duration-500 ease-smooth",
                index === mediaIndex
                  ? "scale-100 opacity-100"
                  : "pointer-events-none absolute scale-105 opacity-0",
              )}
              preload={index === 0}
            />
          ))
        )}

        {burstKey > 0 && (
          <Heart
            key={burstKey}
            className="animate-heart-burst pointer-events-none absolute left-1/2 top-1/2 size-24 fill-white text-white drop-shadow-[0_2px_16px_rgba(0,0,0,0.35)]"
          />
        )}

        {post.mediaUrls.length > 1 && (
          <>
            <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-white backdrop-blur-sm">
              {mediaIndex + 1}/{post.mediaUrls.length}
            </span>

            {mediaIndex > 0 && (
              <button
                type="button"
                onClick={() => setMediaIndex((i) => i - 1)}
                className="glass absolute left-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full opacity-100 shadow-lifted transition-all duration-200 ease-smooth hover:scale-110 active:scale-95 focus-visible:opacity-100 sm:opacity-0 sm:group-hover/media:opacity-100"
                aria-label="Previous photo"
              >
                <ChevronLeft className="size-4" />
              </button>
            )}
            {mediaIndex < post.mediaUrls.length - 1 && (
              <button
                type="button"
                onClick={() => setMediaIndex((i) => i + 1)}
                className="glass absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full opacity-100 shadow-lifted transition-all duration-200 ease-smooth hover:scale-110 active:scale-95 focus-visible:opacity-100 sm:opacity-0 sm:group-hover/media:opacity-100"
                aria-label="Next photo"
              >
                <ChevronRight className="size-4" />
              </button>
            )}

            <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1 rounded-full bg-black/35 px-2 py-1 backdrop-blur-sm">
              {post.mediaUrls.map((url, index) => (
                <span
                  key={url}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300 ease-smooth",
                    index === mediaIndex
                      ? "w-4 bg-white"
                      : "w-1.5 bg-white/50",
                  )}
                />
              ))}
            </div>
          </>
        )}

        {/* Music sticker: the looping track plus a mute toggle in the bottom-
            right corner of the media, like reels. */}
        {hasMusic && post.music && (
          <>
            <MusicTrackAudio
              src={post.music.previewUrl!}
              active={musicActive}
              muted={isMusicMuted}
            />
            <button
              type="button"
              onClick={() => setIsMusicMuted((m) => !m)}
              aria-label={isMusicMuted ? "Unmute music" : "Mute music"}
              className="glass-media absolute bottom-3 right-3 grid size-9 place-items-center rounded-full text-white transition-transform duration-200 ease-spring hover:scale-110 active:scale-90"
            >
              {isMusicMuted ? (
                <VolumeX className="size-4" />
              ) : (
                <Volume2 className="size-4" />
              )}
            </button>
          </>
        )}
      </div>

      <div className="flex items-center justify-between px-2.5 pt-1.5 sm:px-3">
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => likeMutation.mutate()}
            aria-label={post.isLikedByMe ? "Unlike" : "Like"}
            className="grid size-10 place-items-center rounded-full transition-all duration-200 ease-spring hover:bg-accent hover:scale-110 active:scale-90"
          >
            <Heart
              key={String(post.isLikedByMe)}
              className={cn(
                "size-6 transition-colors duration-200",
                post.isLikedByMe &&
                  "animate-like-pop fill-destructive text-destructive",
              )}
            />
          </button>
          <button
            type="button"
            onClick={() => openComments(true)}
            aria-label="Comment"
            className="grid size-10 place-items-center rounded-full transition-all duration-200 ease-spring hover:bg-accent hover:scale-110 active:scale-90"
          >
            <MessageCircle className="size-6 -scale-x-100" />
          </button>
          <button
            type="button"
            onClick={() => setShareOpen(true)}
            aria-label="Send in a message"
            className="grid size-10 place-items-center rounded-full transition-all duration-200 ease-spring hover:bg-accent hover:scale-110 active:scale-90"
          >
            <Send className="size-6" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => saveMutation.mutate()}
          aria-label={post.isSavedByMe ? "Unsave" : "Save"}
          className="grid size-10 place-items-center rounded-full transition-all duration-200 ease-spring hover:bg-accent hover:scale-110 active:scale-90"
        >
          <Bookmark
            key={String(post.isSavedByMe)}
            className={cn(
              "size-6",
              post.isSavedByMe &&
                "animate-like-pop fill-foreground text-foreground",
            )}
          />
        </button>
      </div>

      <div className="space-y-1.5 px-4 pt-1">
        <p className="text-sm font-semibold tabular-nums">
          {post.likesCount.toLocaleString()}{" "}
          {post.likesCount === 1 ? "like" : "likes"}
        </p>

        {post.music && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Music className="size-3.5 shrink-0" />
            <span className="truncate">
              {post.music.title} · {post.music.artist}
            </span>
          </p>
        )}

        {post.caption && (
          <p className="text-sm leading-relaxed">
            <Link
              href={`/${post.author.username}`}
              className="mr-1.5 font-semibold hover:text-muted-foreground"
            >
              {post.author.username}
            </Link>
            <span className="whitespace-pre-line">
              {isLongCaption && !captionExpanded
                ? `${post.caption.slice(0, CAPTION_CLAMP_LENGTH).trimEnd()}… `
                : post.caption}
            </span>
            {isLongCaption && !captionExpanded && (
              <button
                type="button"
                onClick={() => setCaptionExpanded(true)}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                more
              </button>
            )}
          </p>
        )}

        <button
          type="button"
          onClick={() => openComments(false)}
          className="block text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          {post.commentsCount > 0
            ? `View all ${post.commentsCount.toLocaleString()} ${
                post.commentsCount === 1 ? "comment" : "comments"
              }`
            : "Add a comment..."}
        </button>
      </div>

      <CommentSheet
        postId={post.id}
        commentsCount={post.commentsCount}
        open={commentsOpen}
        onOpenChange={setCommentsOpen}
        autoFocusInput={focusComposer}
      />

      <SharePostModal
        postId={post.id}
        open={shareOpen}
        onOpenChange={setShareOpen}
      />
    </article>
  );
}
