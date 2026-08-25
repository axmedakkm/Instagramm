"use client";

import { Music, Plus } from "lucide-react";
import { useState } from "react";
import { NoteComposerModal } from "@/components/messages/NoteComposerModal";
import { UserAvatar } from "@/components/shared/UserAvatar";
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

  if (!currentUser) return null;

  // A note past its 24h life is treated as if it were never there.
  const activeNote = note && !isNoteExpired(note) ? note : null;

  return (
    <div className="no-scrollbar flex gap-4 overflow-x-auto px-4 pb-3 pt-1">
      <button
        type="button"
        onClick={() => setComposerOpen(true)}
        className="flex w-[72px] shrink-0 flex-col items-center gap-1"
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
          {activeNote?.music && (
            <span className="mt-0.5 flex items-center gap-1 text-[9px] text-muted-foreground">
              <Music className="size-2.5 shrink-0" />
              <span className="truncate">{activeNote.music.title}</span>
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
          <UserAvatar user={currentUser} size="lg" />
          {!activeNote && (
            <span className="absolute -bottom-0.5 -right-0.5 grid size-4 place-items-center rounded-full border-2 border-background bg-primary text-primary-foreground">
              <Plus className="size-2.5" strokeWidth={3} />
            </span>
          )}
        </span>

        <span className="w-full truncate text-center text-[11px] text-muted-foreground">
          Your note
        </span>
      </button>

      <NoteComposerModal open={composerOpen} onOpenChange={setComposerOpen} />
    </div>
  );
}
