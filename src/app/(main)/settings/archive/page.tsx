"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, ChevronLeft, Heart, Trash2 } from "lucide-react";
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
          <h1 className="text-xl font-semibold">Story archive</h1>
          <p className="text-xs text-muted-foreground">
            Your stories are saved here after 24 hours. Only you can see them.
          </p>
        </div>
      </header>

      {isLoading && (
        <div className="grid grid-cols-3 gap-1 p-1">
          {Array.from({ length: 9 }).map((_, index) => (
            <Skeleton key={index} className="aspect-square rounded-none" />
          ))}
        </div>
      )}

      {!isLoading && stories?.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-4 px-4 py-24 text-center">
          <div className="flex size-20 items-center justify-center rounded-full border-2 border-foreground">
            <Archive className="size-9" />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-light">Nothing archived yet</h2>
            <p className="mx-auto max-w-sm text-sm text-muted-foreground">
              Once one of your stories is more than 24 hours old, it lands
              here automatically.
            </p>
          </div>
        </div>
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
