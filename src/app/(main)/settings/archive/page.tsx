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
    </div>
  );
}
