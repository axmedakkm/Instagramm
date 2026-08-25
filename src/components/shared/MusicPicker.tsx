"use client";

import { Music, Search, X } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { STORY_MUSIC } from "@/lib/storyMusic";
import type { StoryMusic } from "@/store/useStoryArchiveStore";

/**
 * Pick a song from the built-in library, with search.
 *
 * Used by both the story composer and the note composer. It owns only its own
 * throwaway UI state (the search box and whether the list is open); the chosen
 * track lives in the parent via `value` / `onChange`.
 */
export function MusicPicker({
  value,
  onChange,
  label = "Add music",
}: {
  value: StoryMusic | null;
  onChange: (music: StoryMusic | null) => void;
  label?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");

  // Match on title *or* artist. Lowercasing both sides means "NOVA", "nova"
  // and "Nova" all find the same track. The library is a handful of items in
  // memory, so this runs on every keystroke with nothing to debounce.
  const search = query.trim().toLowerCase();
  const visibleTracks = STORY_MUSIC.filter(
    (track) =>
      track.title.toLowerCase().includes(search) ||
      track.artist.toLowerCase().includes(search),
  );

  const handlePick = (track: StoryMusic) => {
    onChange(track);
    setIsOpen(false);
    setQuery("");
  };

  // A track is already chosen — show it with a remove button instead.
  if (value) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg bg-accent px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <Music className="size-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{value.title}</p>
            <p className="truncate text-xs text-muted-foreground">
              {value.artist}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          aria-label="Remove music"
          className="shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="flex items-center gap-2 rounded-md px-1 py-1 text-sm font-medium transition-colors hover:text-primary"
      >
        <Music className="size-4" />
        {label}
      </button>

      {isOpen && (
        <div className="space-y-1 pt-1">
          {/* Search box. The icon sits over the input, which gets left
              padding to make room for it. */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search music"
              className="h-9 pl-9"
            />
          </div>

          <div className="max-h-44 space-y-0.5 overflow-y-auto">
            {visibleTracks.map((track) => (
              <button
                key={track.id}
                type="button"
                onClick={() => handlePick(track)}
                className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors hover:bg-accent"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-md bg-[linear-gradient(135deg,#f9ce34,#ee2a7b,#6228d7)] text-white">
                  <Music className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">
                    {track.title}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {track.artist}
                  </span>
                </span>
              </button>
            ))}

            {visibleTracks.length === 0 && (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                No music matches &ldquo;{query.trim()}&rdquo;.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
