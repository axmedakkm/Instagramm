"use client";

import { useQuery } from "@tanstack/react-query";
import { Check, Loader2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { storiesApi } from "@/services/api";
import { queryKeys } from "@/services/queryKeys";
import { useHighlightsStore, type Highlight } from "@/store/useHighlightsStore";

/**
 * Create a highlight, or add more stories to an existing one.
 *
 * Pass `highlight` to add to that one (the name field is hidden — it already
 * has a name); omit it to create a new one.
 */
export function HighlightEditorModal({
  open,
  onOpenChange,
  highlight,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  highlight?: Highlight;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {highlight ? `Add to ${highlight.title}` : "New highlight"}
          </DialogTitle>
        </DialogHeader>

        {/* Mounted fresh each time the dialog opens, so the form seeds itself
            from props with plain useState and needs no syncing effect. */}
        {open && (
          <EditorForm
            highlight={highlight}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function EditorForm({
  highlight,
  onDone,
}: {
  highlight?: Highlight;
  onDone: () => void;
}) {
  const createHighlight = useHighlightsStore((state) => state.create);
  const addStories = useHighlightsStore((state) => state.addStories);

  const [title, setTitle] = useState(highlight?.title ?? "");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data: archive, isLoading } = useQuery({
    queryKey: queryKeys.stories.archive,
    queryFn: storiesApi.archive,
  });

  // When adding to an existing highlight, hide what's already in it.
  const stories = (archive ?? []).filter(
    (story) => !highlight?.storyIds.includes(story.id),
  );

  const toggle = (storyId: string) =>
    setSelectedIds((current) =>
      current.includes(storyId)
        ? current.filter((id) => id !== storyId)
        : [...current, storyId],
    );

  const canSave = selectedIds.length > 0 && (!!highlight || !!title.trim());

  const handleSave = () => {
    if (!canSave) return;
    if (highlight) {
      addStories(highlight.id, selectedIds);
      toast.success(`Added to ${highlight.title}`);
    } else {
      createHighlight(title.trim(), selectedIds);
      toast.success("Highlight created");
    }
    onDone();
  };

  return (
    <>
      <div className="space-y-3">
        {!highlight && (
          <Input
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Highlight name"
            maxLength={30}
          />
        )}

        {isLoading && (
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="aspect-[9/16] rounded-lg" />
            ))}
          </div>
        )}

        {!isLoading && stories.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">
            {archive?.length
              ? "Every archived story is already in this highlight."
              : "You haven't posted any stories yet."}
          </p>
        )}

        {stories.length > 0 && (
          <div className="grid max-h-72 grid-cols-3 gap-2 overflow-y-auto">
            {stories.map((story) => {
              const isSelected = selectedIds.includes(story.id);
              return (
                <button
                  key={story.id}
                  type="button"
                  onClick={() => toggle(story.id)}
                  aria-pressed={isSelected}
                  className={cn(
                    "relative aspect-[9/16] overflow-hidden rounded-lg bg-muted transition-opacity",
                    isSelected ? "opacity-100" : "opacity-70 hover:opacity-100",
                  )}
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
                      alt=""
                      fill
                      sizes="120px"
                      className="object-cover"
                    />
                  )}

                  {/* Selection tick, top-right. */}
                  <span
                    className={cn(
                      "absolute right-1.5 top-1.5 grid size-5 place-items-center rounded-full border-2",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-white/80 bg-black/25",
                    )}
                  >
                    {isSelected && <Check className="size-3" strokeWidth={3} />}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button disabled={!canSave} onClick={handleSave}>
          {isLoading && <Loader2 className="size-4 animate-spin" />}
          {highlight
            ? `Add ${selectedIds.length || ""}`.trim()
            : "Create"}
        </Button>
      </DialogFooter>
    </>
  );
}
