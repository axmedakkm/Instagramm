"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2, Music, Search, X } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/useDebounce";
import { musicApi } from "@/services/api";
import { queryKeys } from "@/services/queryKeys";
import type { MusicTrack } from "@/types";

/**
 * Pick a song from the catalogue, with search.
 *
 * Used by both the story composer and the note composer. It owns only its own
 * throwaway UI state (the search box and whether the list is open); the chosen
 * track lives in the parent via `value` / `onChange`.
 *
 * Results come from `GET /music/search`, which the backend proxies to Apple's
 * iTunes Search API — so this is a real catalogue, not a fixed list. That's
 * also why the query is debounced: every keystroke would otherwise be a
 * request.
 */
export function MusicPicker({
  value,
  onChange,
  label = "Add music",
}: {
  value: MusicTrack | null;
  onChange: (music: MusicTrack | null) => void;
  label?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query.trim(), 350);

  const { data: tracks, isFetching, isError } = useQuery({
    queryKey: queryKeys.music.search(debouncedQuery),
    queryFn: () => musicApi.search(debouncedQuery),
    enabled: isOpen && debouncedQuery.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const handlePick = (track: MusicTrack) => {
    onChange(track);
    setIsOpen(false);
    setQuery("");
  };

  // A track is already chosen — show it with a remove button instead.
  if (value) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg bg-accent px-3 py-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <Artwork track={value} />
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
              placeholder="Search for a song or artist"
              className="h-9 pl-9 pr-9"
            />
            {isFetching && (
              <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>

          <div className="max-h-52 space-y-0.5 overflow-y-auto">
            {debouncedQuery.length === 0 && (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                Search for a song to add.
              </p>
            )}

            {isError && (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                Couldn&apos;t reach the music catalogue.
              </p>
            )}

            {tracks?.map((track) => (
              <button
                key={track.trackId}
                type="button"
                onClick={() => handlePick(track)}
                className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors hover:bg-accent"
              >
                <Artwork track={track} />
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

            {tracks?.length === 0 && !isFetching && (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                No music matches &ldquo;{debouncedQuery}&rdquo;.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Album cover, falling back to a gradient tile when there isn't one. */
function Artwork({ track }: { track: MusicTrack }) {
  if (!track.artworkUrl) {
    return (
      <span className="grid size-9 shrink-0 place-items-center rounded-md bg-[linear-gradient(135deg,#f9ce34,#ee2a7b,#6228d7)] text-white">
        <Music className="size-4" />
      </span>
    );
  }

  return (
    <Image
      src={track.artworkUrl}
      alt=""
      width={36}
      height={36}
      className="size-9 shrink-0 rounded-md object-cover"
    />
  );
}
