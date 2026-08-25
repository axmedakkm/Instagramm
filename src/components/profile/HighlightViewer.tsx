"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { TimeAgo } from "@/components/shared/TimeAgo";
import { storiesApi } from "@/services/api";
import { queryKeys } from "@/services/queryKeys";
import { useHighlightsStore, type Highlight } from "@/store/useHighlightsStore";

/**
 * Pages through the stories in a highlight. Unlike the story viewer this
 * doesn't auto-advance on a timer — a highlight is something you browse, not
 * something that plays at you.
 */
export function HighlightViewer({
  highlight,
  open,
  onOpenChange,
  canEdit,
}: {
  highlight: Highlight;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canEdit: boolean;
}) {
  const [index, setIndex] = useState(0);
  const removeStory = useHighlightsStore((state) => state.removeStory);
  const removeHighlight = useHighlightsStore((state) => state.remove);

  const { data: archive } = useQuery({
    queryKey: queryKeys.stories.archive,
    queryFn: storiesApi.archive,
    enabled: open,
  });

  // Resolve ids against the archive and keep the highlight's own order.
  const stories = highlight.storyIds
    .map((storyId) => archive?.find((story) => story.id === storyId))
    .filter((story) => story !== undefined);

  // The index can outrun the list after a removal, so clamp on the way out
  // rather than tracking it in an effect.
  const current = stories[Math.min(index, stories.length - 1)];

  const handleRemove = () => {
    if (!current) return;
    removeStory(highlight.id, current.id);
    // Taking out the last one leaves an empty highlight, which is just
    // clutter on the profile — drop the whole thing and close.
    if (stories.length === 1) {
      removeHighlight(highlight.id);
      toast.success("Highlight deleted");
      onOpenChange(false);
      return;
    }
    setIndex((value) => Math.max(0, Math.min(value, stories.length - 2)));
    toast.success("Removed from highlight");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm gap-0 overflow-hidden p-0">
        <DialogTitle className="sr-only">{highlight.title}</DialogTitle>

        <div className="relative aspect-[9/16] w-full bg-black">
          {current ? (
            current.mediaType === "video" ? (
              <video
                key={current.id}
                src={current.mediaUrl}
                controls
                autoPlay
                playsInline
                className="size-full object-contain"
              />
            ) : (
              <Image
                key={current.id}
                src={current.mediaUrl}
                alt={current.caption || highlight.title}
                fill
                sizes="384px"
                className="object-contain"
              />
            )
          ) : (
            <p className="grid size-full place-items-center px-6 text-center text-sm text-white/70">
              These stories are no longer available.
            </p>
          )}

          {/* Segment bar, one notch per story. */}
          {stories.length > 1 && (
            <div className="absolute inset-x-2 top-2 flex gap-1">
              {stories.map((story, storyIndex) => (
                <span
                  key={story.id}
                  className={`h-0.5 flex-1 rounded-full ${
                    storyIndex <= index ? "bg-white" : "bg-white/30"
                  }`}
                />
              ))}
            </div>
          )}

          {index > 0 && (
            <button
              type="button"
              onClick={() => setIndex((value) => value - 1)}
              aria-label="Previous story"
              className="glass-media absolute left-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-white"
            >
              <ChevronLeft className="size-5" />
            </button>
          )}
          {index < stories.length - 1 && (
            <button
              type="button"
              onClick={() => setIndex((value) => value + 1)}
              aria-label="Next story"
              className="glass-media absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-white"
            >
              <ChevronRight className="size-5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 p-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{highlight.title}</p>
            {current && (
              <p className="text-xs text-muted-foreground">
                <TimeAgo date={current.createdAt} />
              </p>
            )}
          </div>

          {canEdit && current && (
            <button
              type="button"
              onClick={handleRemove}
              aria-label="Remove from highlight"
              className="shrink-0 rounded-full p-2 text-destructive transition-colors hover:bg-accent"
            >
              <Trash2 className="size-5" />
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
