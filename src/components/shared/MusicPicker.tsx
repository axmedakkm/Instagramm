"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2, Music, X } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { musicApi } from "@/services/api";
import { queryKeys } from "@/services/queryKeys";
import type { MusicTrack } from "@/types";

/**
 * Pick a song for a story or a note.
 *
 * The list comes straight from `GET /music/trending` — the backend's curated
 * catalogue — so opening the picker shows real tracks immediately with
 * nothing to type. Both composers use this, so a note and a story pick from
 * exactly the same catalogue.
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

  const { data: tracks, isLoading, isError } = useQuery({
    queryKey: queryKeys.music.trending,
    queryFn: () => musicApi.trending(),
    // Nothing is fetched until the picker is actually opened.
    enabled: isOpen,
    staleTime: 10 * 60 * 1000,
  });

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
        <div className="max-h-52 space-y-0.5 overflow-y-auto pt-1">
          {isLoading && (
            <div className="flex justify-center py-6 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          )}

          {isError && (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              Couldn&apos;t load the music catalogue.
            </p>
          )}

          {tracks?.map((track) => (
            <button
              key={track.trackId}
              type="button"
              onClick={() => {
                onChange(track);
                setIsOpen(false);
              }}
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

          {tracks?.length === 0 && (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              No music available right now.
            </p>
          )}
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
