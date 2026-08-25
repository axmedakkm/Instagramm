"use client";

import { useQuery } from "@tanstack/react-query";
import { Pause, Play, Plus } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { StoryRing } from "@/components/feed/StoryRing";
import { NoteComposerModal } from "@/components/messages/NoteComposerModal";
import { NoteBubble } from "@/components/shared/NoteBubble";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { notesApi, storiesApi } from "@/services/api";
import { queryKeys } from "@/services/queryKeys";
import { useAuthStore } from "@/store/useAuthStore";

/**
 * The rail of notes above the inbox. Now backed by the real `/notes` endpoint,
 * so it shows your own note (first, as a composer button) followed by a note
 * from each person you follow. Your note reaches your followers the same way.
 */
export function NotesRail() {
  const currentUser = useAuthStore((state) => state.user);
  const [composerOpen, setComposerOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const { data: notes } = useQuery({
    queryKey: queryKeys.notes.list,
    queryFn: notesApi.list,
    enabled: !!currentUser,
    staleTime: 30 * 1000,
  });

  // Your own live stories — drives the ring around your avatar here, and
  // shares its cache with the stories bar on the feed.
  const { data: myStories } = useQuery({
    queryKey: queryKeys.stories.byUser(currentUser?.id ?? ""),
    queryFn: () => storiesApi.byUser(currentUser!.id),
    enabled: !!currentUser,
    staleTime: 60 * 1000,
  });

  if (!currentUser) return null;

  const myNote = notes?.find((n) => n.author.id === currentUser.id) ?? null;
  const otherNotes = (notes ?? []).filter(
    (n) => n.author.id !== currentUser.id,
  );

  const myTrack = myNote?.music;
  const canPlay = !!myTrack?.previewUrl;

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
      {/* Your note — a button that opens the composer. The play control is a
          sibling of that button, not a child: a button inside a button is
          invalid HTML and the inner one stops being reachable. */}
      <div className="relative flex w-[72px] shrink-0 flex-col items-center gap-1">
        <button
          type="button"
          onClick={() => setComposerOpen(true)}
          className="flex w-full flex-col items-center gap-1"
        >
          {/* The bubble always renders — your note, or a muted "Note" prompt —
              so the avatar never shifts up and down. */}
          {myNote ? (
            <NoteBubble note={myNote} />
          ) : (
            <span className="relative block w-full rounded-2xl bg-muted px-2 py-1.5 text-[10px] leading-tight text-muted-foreground">
              <span className="line-clamp-2 block break-words">Note...</span>
              <span className="absolute -bottom-[3px] left-1/2 size-2 -translate-x-1/2 rotate-45 rounded-[1px] bg-muted" />
            </span>
          )}

          <span className="relative">
            <StoryRing
              user={currentUser}
              hasStory={hasStory}
              hasUnviewed={hasUnviewed}
              size="lg"
            />
            {!myNote && (
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
            aria-label={isPlaying ? `Pause ${myTrack.title}` : `Play ${myTrack.title}`}
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
            src={myTrack.previewUrl ?? undefined}
            loop
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
        )}
      </div>

      {/* Notes from people you follow — each links to their profile. */}
      {otherNotes.map((note) => (
        <Link
          key={note.id}
          href={`/${note.author.username}`}
          className="flex w-[72px] shrink-0 flex-col items-center gap-1"
        >
          <NoteBubble note={note} />
          <UserAvatar user={note.author} size="lg" />
          <span className="w-full truncate text-center text-[11px] text-muted-foreground">
            {note.author.username}
          </span>
        </Link>
      ))}

      <NoteComposerModal
        open={composerOpen}
        onOpenChange={setComposerOpen}
        note={myNote}
      />
    </div>
  );
}
