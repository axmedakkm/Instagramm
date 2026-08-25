"use client";

import { Archive, ChevronLeft, Music, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { TimeAgo } from "@/components/shared/TimeAgo";
import { Button } from "@/components/ui/button";
import { useStoryArchiveStore } from "@/store/useStoryArchiveStore";

export default function ArchivePage() {
  const router = useRouter();
  const stories = useStoryArchiveStore((state) => state.stories);
  const remove = useStoryArchiveStore((state) => state.remove);

  return (
    <div className="mx-auto w-full max-w-3xl">
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Heart, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { TimeAgo } from "@/components/shared/TimeAgo";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { storiesApi } from "@/services/api";
import { queryKeys } from "@/services/queryKeys";
import type { ArchivedStory } from "@/types";

/**
 * Every story you've ever posted, active or expired — the backend stops
 * deleting a story once it passes 24h (see insta_Back's cleanupExpired.js),
 * it just drops out of the active feed/profile. Author-only, so this reads
 * straight from `/stories/me/archive` with no separate userId.
 *
 * Deliberately shows like counts, not view counts: this is about your own
 * content in retrospect, not who watched it (that's still on the live story
 * itself, via "Seen by" — see StoryViewer).
 */
export default function StoryArchivePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<ArchivedStory | null>(null);

  const { data: stories, isLoading } = useQuery({
    queryKey: queryKeys.stories.archive,
    queryFn: storiesApi.archive,
  });

  const deleteStory = useMutation({
    mutationFn: (storyId: string) => storiesApi.delete(storyId),
    onSuccess: (_data, storyId) => {
      queryClient.setQueryData<ArchivedStory[]>(
        queryKeys.stories.archive,
        (old) => old?.filter((story) => story.id !== storyId),
      );
      setSelected(null);
    },
    onError: () => toast.error("Couldn't delete that story."),
  });

  return (
    <div className="mx-auto w-full max-w-xl">
      <header className="flex items-center gap-2 border-b border-border px-4 py-4">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Go back"
          className="size-8"
          onClick={() => router.back()}
        >
          <ChevronLeft className="size-5" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold">Archive</h1>
          <p className="text-xs text-muted-foreground">
            Your stories are saved here after 24 hours. Only you can see them.
          </p>
        </div>
      </header>

      {stories.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 px-4 py-24 text-center">
          <div className="flex size-20 items-center justify-center rounded-full border-2 border-foreground">
            <Archive className="size-9" />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-light">Nothing archived yet</h2>
            <p className="mx-auto max-w-sm text-sm text-muted-foreground">
              When you share a story, a copy is saved here automatically so you
              can look back on it after it disappears.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1.5 p-1.5 sm:gap-2 sm:p-2">
          {stories.map((story) => (
            <div
              key={story.id}
              className="group relative aspect-[9/16] overflow-hidden rounded-xl bg-muted"
        <h1 className="text-xl font-semibold">Story archive</h1>
      </header>

      {isLoading && (
        <div className="grid grid-cols-3 gap-1 p-1">
          {Array.from({ length: 9 }).map((_, index) => (
            <Skeleton key={index} className="aspect-square rounded-none" />
          ))}
        </div>
      )}

      {!isLoading && stories?.length === 0 && (
        <p className="py-16 text-center text-sm text-muted-foreground">
          No stories yet. Once one of your stories is more than 24 hours
          old, it lands here.
        </p>
      )}

      {!isLoading && stories && stories.length > 0 && (
        <div className="grid grid-cols-3 gap-1 p-1">
          {stories.map((story) => (
            <button
              key={story.id}
              type="button"
              onClick={() => setSelected(story)}
              className="group relative aspect-square overflow-hidden bg-muted"
            >
              {story.mediaType === "video" ? (
                <video
                  src={story.mediaUrl}
                  muted
                  playsInline
                  preload="metadata"
                  className="size-full object-cover"
                />
              ) : (
                <Image
                  src={story.mediaUrl}
                  alt="Archived story"
                  fill
                  sizes="(max-width: 640px) 33vw, 240px"
                  className="object-cover"
                />
              )}

              {/* Bottom fade so the date/music stay readable over any image. */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/70 to-transparent" />

              <div className="absolute inset-x-2 bottom-2 space-y-1 text-white">
                <TimeAgo
                  date={story.createdAt}
                  className="block text-[11px] font-medium drop-shadow"
                />
                {story.music && (
                  <span className="flex items-center gap-1 text-[11px] drop-shadow">
                    <Music className="size-3 shrink-0" />
                    <span className="truncate">{story.music.title}</span>
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => remove(story.id)}
                aria-label="Delete from archive"
                className="absolute right-1.5 top-1.5 rounded-full bg-black/50 p-1.5 text-white opacity-0 transition-opacity hover:bg-black/70 focus-visible:opacity-100 group-hover:opacity-100"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}
                  alt={story.caption || "Story"}
                  fill
                  sizes="(max-width: 768px) 33vw, 300px"
                  className="object-cover"
                />
              )}
              <div className="absolute inset-0 hidden items-center justify-center bg-black/40 text-white group-hover:flex">
                <span className="flex items-center gap-1.5 font-semibold">
                  <Heart className="size-5 fill-white" />
                  {story.likesCount.toLocaleString()}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      <Dialog
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <DialogContent className="max-w-sm gap-0 overflow-hidden p-0">
          <DialogTitle className="sr-only">Archived story</DialogTitle>
          {selected && (
            <>
              <div className="relative aspect-[9/16] w-full bg-black">
                {selected.mediaType === "video" ? (
                  <video
                    src={selected.mediaUrl}
                    controls
                    playsInline
                    className="size-full object-contain"
                  />
                ) : (
                  <Image
                    src={selected.mediaUrl}
                    alt={selected.caption || "Story"}
                    fill
                    sizes="384px"
                    className="object-contain"
                  />
                )}
              </div>
              <div className="flex items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  {selected.caption && (
                    <p className="truncate text-sm">{selected.caption}</p>
                  )}
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <TimeAgo date={selected.createdAt} />
                    <span aria-hidden>·</span>
                    <Heart className="size-3.5" />
                    {selected.likesCount.toLocaleString()}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-destructive hover:text-destructive"
                  aria-label="Delete story"
                  disabled={deleteStory.isPending}
                  onClick={() => deleteStory.mutate(selected.id)}
                >
                  <Trash2 className="size-5" />
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
