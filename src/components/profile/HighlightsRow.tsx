"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { HighlightEditorModal } from "@/components/profile/HighlightEditorModal";
import { HighlightViewer } from "@/components/profile/HighlightViewer";
import { storiesApi } from "@/services/api";
import { queryKeys } from "@/services/queryKeys";
import { useHighlightsStore, type Highlight } from "@/store/useHighlightsStore";

/**
 * The row of highlight circles under the profile header.
 *
 * Owner-only for now: highlights live in localStorage (see
 * `useHighlightsStore`), so there's nothing to show on someone else's
 * profile — the component renders nothing rather than an empty rail.
 */
export function HighlightsRow({ isOwner }: { isOwner: boolean }) {
  const highlights = useHighlightsStore((state) => state.highlights);
  const [editorOpen, setEditorOpen] = useState(false);
  const [viewing, setViewing] = useState<Highlight | null>(null);

  // Covers come from the archive, so ids resolve to real media.
  const { data: archive } = useQuery({
    queryKey: queryKeys.stories.archive,
    queryFn: storiesApi.archive,
    enabled: isOwner,
  });

  if (!isOwner) return null;
  if (highlights.length === 0 && !archive?.length) return null;

  return (
    <div className="no-scrollbar flex gap-5 overflow-x-auto px-4 pb-5">
      {highlights.map((highlight) => {
        const cover = archive?.find(
          (story) => story.id === highlight.storyIds[0],
        );

        return (
          <button
            key={highlight.id}
            type="button"
            onClick={() => setViewing(highlight)}
            className="flex w-[72px] shrink-0 flex-col items-center gap-1.5"
          >
            <span className="grid size-16 place-items-center rounded-full border border-border p-[3px] transition-transform duration-200 ease-spring hover:scale-105">
              <span className="relative size-full overflow-hidden rounded-full bg-muted">
                {cover &&
                  (cover.mediaType === "video" ? (
                    <video
                      src={cover.mediaUrl}
                      muted
                      playsInline
                      preload="metadata"
                      className="size-full object-cover"
                    />
                  ) : (
                    <Image
                      src={cover.mediaUrl}
                      alt=""
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  ))}
              </span>
            </span>
            <span className="w-full truncate text-center text-xs">
              {highlight.title}
            </span>
          </button>
        );
      })}

      <button
        type="button"
        onClick={() => setEditorOpen(true)}
        className="flex w-[72px] shrink-0 flex-col items-center gap-1.5"
      >
        <span className="grid size-16 place-items-center rounded-full border border-dashed border-border text-muted-foreground transition-colors duration-200 hover:border-foreground hover:text-foreground">
          <Plus className="size-6" />
        </span>
        <span className="w-full truncate text-center text-xs">New</span>
      </button>

      <HighlightEditorModal open={editorOpen} onOpenChange={setEditorOpen} />

      {viewing && (
        <HighlightViewer
          highlight={viewing}
          open
          onOpenChange={(open) => !open && setViewing(null)}
          canEdit={isOwner}
        />
      )}
    </div>
  );
}
