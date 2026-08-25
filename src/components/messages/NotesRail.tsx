"use client";

import { useQuery } from "@tanstack/react-query";
import { Music, Pause, Play, Plus } from "lucide-react";
import { useRef, useState } from "react";
import { StoryRing } from "@/components/feed/StoryRing";
import { NoteComposerModal } from "@/components/messages/NoteComposerModal";
import { storiesApi } from "@/services/api";
import { queryKeys } from "@/services/queryKeys";
import { isNoteExpired, useNotesStore } from "@/store/useNotesStore";
import { useAuthStore } from "@/store/useAuthStore";

/**
 * The rail of notes above the inbox. Right now it holds exactly one entry —
 * yours — because notes live in localStorage and there's no backend endpoint
 * that could hand us anybody else's. It's laid out as a scrolling rail so
 * other people's notes drop straight in once that endpoint exists.
 */
export function NotesRail() {
  const currentUser = useAuthStore((state) => state.user);
  const note = useNotesStore((state) => state.note);
  const [composerOpen, setComposerOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Your own live stories — drives the ring around your avatar here, and
  // shares its cache with the stories bar on the feed.
  const { data: myStories } = useQuery({
    queryKey: queryKeys.stories.byUser(currentUser?.id ?? ""),
    queryFn: () => storiesApi.byUser(currentUser!.id),
    enabled: !!currentUser,
    staleTime: 60 * 1000,
  });

  if (!currentUser) return null;

  // A note past its 24h life is treated as if it were never there.
  const activeNote = note && !isNoteExpired(note) ? note : null;
  const track = activeNote?.music;
  const canPlay = !!track?.previewUrl;

  const hasStory = !!myStories && myStories.length > 0;
  const hasUnviewed = !!myStories?.some((story) => !story.isViewedByMe);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  };

  return (
    <div className="no-scrollbar flex gap-4 overflow-x-auto px-4 pb-3 pt-1">
      {/* The play control has to be a sibling of the composer button, not a
          child: a button inside a button is invalid HTML and the inner one
          stops being reachable. */}
      <div className="relative flex w-[72px] shrink-0 flex-col items-center gap-1">
        <button
          type="button"
          onClick={() => setComposerOpen(true)}
          className="flex w-full flex-col items-center gap-1"
        >
          {/* The bubble. It always renders — with your note in it, or a muted
              "Note" prompt — so the avatar never shifts up and down. */}
          <span
            className={
              activeNote
                ? "relative w-full rounded-2xl bg-secondary px-2 py-1.5 text-[10px] font-medium leading-tight text-secondary-foreground"
                : "relative w-full rounded-2xl bg-muted px-2 py-1.5 text-[10px] leading-tight text-muted-foreground"
            }
          >
            <span className="line-clamp-2 block break-words">
              {activeNote ? activeNote.text : "Note..."}
            </span>

            {/* Music line, only when a song is attached. */}
            {track && (
              <span className="mt-0.5 flex items-center gap-1 text-[9px] text-muted-foreground">
                <Music className="size-2.5 shrink-0" />
                <span className="truncate">{track.title}</span>
              </span>
            )}

            {/* Little tail pointing down at the avatar. */}
            <span
              className={`absolute -bottom-[3px] left-1/2 size-2 -translate-x-1/2 rotate-45 rounded-[1px] ${
                activeNote ? "bg-secondary" : "bg-muted"
              }`}
            />
          </span>

          <span className="relative">
            <StoryRing
              user={currentUser}
              hasStory={hasStory}
              hasUnviewed={hasUnviewed}
              size="lg"
            />
            {!activeNote && (
              <span className="absolute -bottom-0.5 -right-0.5 grid size-4 place-items-center rounded-full border-2 border-background bg-primary text-primary-foreground">
                <Plus className="size-2.5" strokeWidth={3} />
              </span>
            )}
          </span>
        </button>

        {/* Plays the same 30s preview a story sticker uses. */}
        {canPlay && (
          <button
            type="button"
            onClick={togglePlay}
            aria-label={
              isPlaying ? `Pause ${track.title}` : `Play ${track.title}`
            }
            className="absolute right-0 top-0 z-10 grid size-5 place-items-center rounded-full border-2 border-background bg-[linear-gradient(135deg,#ee2a7b,#6228d7)] text-white shadow-soft transition-transform duration-200 ease-spring hover:scale-110 active:scale-90"
          >
            {isPlaying ? (
              <Pause className="size-2.5 fill-current" />
            ) : (
              <Play className="size-2.5 translate-x-px fill-current" />
            )}
          </button>
        )}

        <span className="w-full truncate text-center text-[11px] text-muted-foreground">
          Your note
        </span>

        {canPlay && (
          <audio
            ref={audioRef}
            src={track.previewUrl ?? undefined}
            loop
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
        )}
      </div>

      <NoteComposerModal open={composerOpen} onOpenChange={setComposerOpen} />
    </div>
  );
}
