"use client";

<<<<<<< HEAD
<<<<<<< HEAD
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, MoreHorizontal, Music, Trash2, X } from "lucide-react";
=======
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Heart, Music, Volume2, VolumeX, X } from "lucide-react";
>>>>>>> 684f43ea61fadf228d86b4716bb4113ea65d2e87
=======
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
<<<<<<< HEAD
import { Eye, MoreHorizontal, Music, Trash2, X } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Heart, Music, Volume2, VolumeX, X } from "lucide-react";
>>>>>>> d1ad0c92b757ea944ee7d9422c6dbf98372df310
=======
import { Eye, Heart, MoreHorizontal, Music, Trash2, Volume2, VolumeX, X } from "lucide-react";
>>>>>>> db41ae3 (dsfngusgudshgfadshfhads)
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { StoryReplyBar } from "@/components/stories/StoryReplyBar";
import { StoryViewersSheet } from "@/components/stories/StoryViewersSheet";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { TimeAgo } from "@/components/shared/TimeAgo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { storiesApi } from "@/services/api";
import { queryKeys } from "@/services/queryKeys";
import { useAuthStore } from "@/store/useAuthStore";
import type { StoryGroup } from "@/types";

const STORY_DURATION_MS = 5000;

export function StoryViewer({ initialUsername }: { initialUsername: string }) {
  const router = useRouter();
  const currentUser = useAuthStore((state) => state.user);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const { data: storyGroups } = useQuery({
    queryKey: queryKeys.stories.feed,
    queryFn: storiesApi.feed,
  });

  // `/stories/feed` never includes the current user's own stories, so we
  // fetch those separately and splice them in when relevant.
  const { data: myStories } = useQuery({
    queryKey: queryKeys.stories.byUser(currentUser?.id ?? ""),
    queryFn: () => storiesApi.byUser(currentUser!.id),
    enabled: !!currentUser,
  });

  const groups: StoryGroup[] = [
    ...(currentUser && myStories && myStories.length > 0
      ? [{ user: currentUser, stories: myStories }]
      : []),
    ...(storyGroups ?? []),
  ];

  // `groupIndex`/`storyIndex` only track *explicit navigation*. Until the
  // viewer has been advanced manually, the active group is derived straight
  // from `initialUsername` during render instead of being synced via an
  // effect, so there's no extra render pass once story data loads.
  const [manualGroupIndex, setManualGroupIndex] = useState<number | null>(null);
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [viewersOpen, setViewersOpen] = useState(false);
  // Starts unmuted (stories are meant to be heard); browsers that block
  // autoplay-with-sound force this to true below, and it carries over story
  // to story, same as tapping the speaker icon does.
  const [isMuted, setIsMuted] = useState(false);

  const derivedGroupIndex = groups.findIndex(
    (group) => group.user.username === initialUsername,
  );
  const groupIndex =
    manualGroupIndex ?? (derivedGroupIndex >= 0 ? derivedGroupIndex : 0);

  const currentGroup = groups[groupIndex];
  const currentStory = currentGroup?.stories[storyIndex];
  const isOwnStory = !!currentUser && currentGroup?.user.id === currentUser.id;
  // The music sticker now comes back on the story itself from the API, so it
  // plays for everyone's stories — not just your own.
  const music = currentStory?.music;

  const close = () => router.push("/feed");

  const goToNextStory = useCallback(() => {
    if (!currentGroup) return;
    if (storyIndex < currentGroup.stories.length - 1) {
      setStoryIndex((i) => i + 1);
      setProgress(0);
      return;
    }
    if (groupIndex < groups.length - 1) {
      setManualGroupIndex(groupIndex + 1);
      setStoryIndex(0);
      setProgress(0);
      return;

    }
    router.push("/feed");
  }, [currentGroup, storyIndex, groupIndex, groups.length, router]);

  const goToPreviousStory = () => {
    if (storyIndex > 0) {
      setStoryIndex((i) => i - 1);
      setProgress(0);
      return;
    }
    if (groupIndex > 0) {
      const previousGroup = groups[groupIndex - 1];
      setManualGroupIndex(groupIndex - 1);
      setStoryIndex((previousGroup?.stories.length ?? 1) - 1);
      setProgress(0);
    }
  };

  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (storyId: string) => storiesApi.delete(storyId),
    onSuccess: () => {
      toast.success("Story deleted");
      // Refresh both the feed and your own stories so the deleted one drops
      // out everywhere, then move on: to the next story if there is one, or
      // back to the feed if that was your last.
      queryClient.invalidateQueries({ queryKey: queryKeys.stories.feed });
      if (currentUser) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.stories.byUser(currentUser.id),
        });
      }
      if (currentGroup && currentGroup.stories.length > 1) {
        goToNextStory();
      } else {
        router.push("/feed");
      }
    },
    onError: () => toast.error("Couldn't delete that story."),
  });

  useEffect(() => {
    if (!currentStory || currentStory.isViewedByMe) return;
    storiesApi
      .markViewed(currentStory.id)
      .then(() => {
        queryClient.invalidateQueries({ queryKey: queryKeys.stories.feed });
        if (currentUser) {
          queryClient.invalidateQueries({
            queryKey: queryKeys.stories.byUser(currentUser.id),
          });
        }
      })
      .catch(() => {});
  }, [currentStory, queryClient, currentUser]);

  // Image stories advance on a fixed timer; video stories advance when the
  // video itself ends (see the <video> element's onEnded/onTimeUpdate below).
  useEffect(() => {
    if (!currentStory || currentStory.mediaType === "video" || isPaused) return;
    const intervalMs = 50;
    const step = (intervalMs / STORY_DURATION_MS) * 100;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev + step >= 100) {
          goToNextStory();
          return 0;
        }
        return prev + step;
      });
    }, intervalMs);

    return () => clearInterval(interval);
  }, [currentStory, goToNextStory, isPaused]);

  // Pause video playback while the viewer is composing a reply. Browsers
  // that block autoplay *with sound* reject `.play()` here — when that
  // happens, fall back to muted (which is always allowed) so the story
  // still plays instead of sitting frozen on its first frame, and flip the
  // speaker icon to match reality instead of lying about it.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isPaused) {
      video.pause();
      return;
    }
    video.play().catch(() => {
      if (!video.muted) {
        video.muted = true;
        setIsMuted(true);
        video.play().catch(() => {});
      }
    });
  }, [isPaused, currentStory, isMuted]);

  // Keep the story's music in step with the pause state (and stop it when the
  // story changes to one without music). Same autoplay-blocked fallback as
  // the video above.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPaused) {
      audio.pause();
      return;
    }
    audio.play().catch(() => {
      if (!audio.muted) {
        audio.muted = true;
        setIsMuted(true);
        audio.play().catch(() => {});
      }
    });
  }, [isPaused, currentStory, music, isMuted]);

  if (!currentGroup || !currentStory) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-black text-white">
        <button type="button" onClick={close} className="absolute right-4 top-4">
          <X className="size-6" />
        </button>
        <p className="text-sm text-white/70">No active stories.</p>
      </div>
    );
  }

  return (
    <div className="relative flex h-screen w-full items-center justify-center bg-black">
      <div className="relative aspect-[9/16] h-full max-h-screen w-full max-w-md bg-neutral-900">
        <div className="absolute inset-x-2 top-2 z-20 flex gap-1">
          {currentGroup.stories.map((story, index) => (
            <div
              key={story.id}
              className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30"
            >
              <div
                className="h-full bg-white"
                style={{
                  width:
                    index < storyIndex
                      ? "100%"
                      : index === storyIndex
                        ? `${progress}%`
                        : "0%",
                }}
              />
            </div>
          ))}
        </div>

        <div className="absolute inset-x-3 top-6 z-20 flex items-center gap-2">
          <Link
            href={`/${currentGroup.user.username}`}
            className="flex min-w-0 items-center gap-2"
          >
            <UserAvatar user={currentGroup.user} size="sm" />
            <span className="truncate text-sm font-semibold text-white">
              {currentGroup.user.username}
            </span>
          </Link>
          <TimeAgo
            date={currentStory.createdAt}
            className="text-xs text-white/70"
          />
          <div className="ml-auto flex items-center gap-1">
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> d1ad0c92b757ea944ee7d9422c6dbf98372df310
            {isOwnStory && (
              // Pause the story timer while the menu is open so it doesn't
              // advance out from under you mid-decision.
              <DropdownMenu onOpenChange={setIsPaused}>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="Story options"
                    className="rounded-full p-1 text-white"
                  >
                    <MoreHorizontal className="size-6" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    variant="destructive"
                    disabled={deleteMutation.isPending}
                    onClick={() => deleteMutation.mutate(currentStory.id)}
                  >
                    <Trash2 className="size-4" />
                    Delete story
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
<<<<<<< HEAD
<<<<<<< HEAD
=======
=======
>>>>>>> d1ad0c92b757ea944ee7d9422c6dbf98372df310
=======
            )}
>>>>>>> db41ae3 (dsfngusgudshgfadshfhads)
            {(currentStory.mediaType === "video" || !!music) && (
              <button
                type="button"
                onClick={() => setIsMuted((m) => !m)}
                aria-label={isMuted ? "Unmute" : "Mute"}
                className="rounded-full p-1 text-white"
              >
                {isMuted ? (
                  <VolumeX className="size-5" />
                ) : (
                  <Volume2 className="size-5" />
                )}
              </button>
<<<<<<< HEAD
>>>>>>> 684f43ea61fadf228d86b4716bb4113ea65d2e87
=======
>>>>>>> d1ad0c92b757ea944ee7d9422c6dbf98372df310
            )}
            <button
              type="button"
              onClick={close}
              className="rounded-full p-1 text-white"
            >
              <X className="size-6" />
            </button>
          </div>
        </div>

        {currentStory.mediaType === "video" ? (
          <video
            key={currentStory.id}
            ref={videoRef}
            src={currentStory.mediaUrl}
            autoPlay
            muted={isMuted}
            playsInline
            className="size-full object-contain"
            onTimeUpdate={(event) => {
              const video = event.currentTarget;
              if (video.duration) {
                setProgress((video.currentTime / video.duration) * 100);
              }
            }}
            onEnded={goToNextStory}
          />
        ) : (
          <Image
            src={currentStory.mediaUrl}
            alt={`${currentGroup.user.username}'s story`}
            fill
            className="object-contain"
            preload
          />
        )}

        {currentStory.caption && (
          <p
            style={
              currentStory.captionPosition
                ? {
                    left: `${currentStory.captionPosition.x}%`,
                    top: `${currentStory.captionPosition.y}%`,
                    transform: "translate(-50%, -50%)",
                  }
                : undefined
            }
            className={
              currentStory.captionPosition
                ? "pointer-events-none absolute z-10 max-w-[85%] text-center text-xl font-semibold text-white drop-shadow-lg"
                : "pointer-events-none absolute inset-x-6 top-1/2 z-10 -translate-y-1/2 text-center text-xl font-semibold text-white drop-shadow-lg"
            }
          >
            {currentStory.caption}
          </p>
        )}

        {music && (
          <>
            {/* Loops for the whole time this story is on screen. Keyed by story
                id so switching stories restarts the track from the top. The
                backend only returns playable tracks, but the field is nullable
                so guard it rather than trust that. */}
            {music.previewUrl && (
              <audio
                key={currentStory.id}
                ref={audioRef}
                src={music.previewUrl}
                autoPlay
                muted={isMuted}
                loop
              />
            )}
            <div className="absolute inset-x-3 bottom-16 z-20 flex justify-center">
              <span className="flex max-w-[80%] items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 text-xs font-medium text-white backdrop-blur">
                <Music className="size-3.5 shrink-0" />
                <span className="truncate">
                  {music.title} · {music.artist}
                </span>
              </span>
            </div>
          </>
        )}

        <button
          type="button"
          aria-label="Previous story"
          onClick={goToPreviousStory}
          className="absolute inset-y-0 left-0 bottom-20 z-10 w-1/3"
        />
        <button
          type="button"
          aria-label="Next story"
          onClick={goToNextStory}
          className="absolute inset-y-0 right-0 bottom-20 z-10 w-1/3"
        />

        <div className="absolute inset-x-3 bottom-4 z-20 flex items-center gap-2">
          {isOwnStory ? (
            <>
              <button
                type="button"
                onClick={() => setViewersOpen(true)}
                className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-2 text-sm text-white backdrop-blur"
              >
                <Eye className="size-4" />
                Seen by {currentStory.viewsCount}
              </button>
              {currentStory.likesCount > 0 && (
                <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-2 text-sm text-white backdrop-blur">
                  <Heart className="size-4 fill-destructive text-destructive" />
                  {currentStory.likesCount}
                </span>
              )}
            </>
          ) : (
            <StoryReplyBar story={currentStory} onActivityChange={setIsPaused} />
          )}
        </div>
      </div>

      {isOwnStory && (
        <StoryViewersSheet
          story={currentStory}
          open={viewersOpen}
          onOpenChange={setViewersOpen}
        />
      )}
    </div>
  );
}
