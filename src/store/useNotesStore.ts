import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { MusicTrack } from "@/types";

/** A short note you leave above your inbox, optionally with a song. */
export interface Note {
  text: string;
  music?: MusicTrack;
  /** ISO timestamp — notes expire 24h after they're posted. */
  createdAt: string;
}

/** Instagram caps notes at 60 characters; so do we. */
export const NOTE_MAX_LENGTH = 60;

const NOTE_LIFETIME_MS = 24 * 60 * 60 * 1000;

/**
 * Your own note, kept locally.
 *
 * The backend has no notes endpoint, so — exactly like `useSavedPostsStore`
 * and `useStoryArchiveStore` — this is a localStorage-backed store. That also
 * means only *your* note exists: other people's notes would have to come from
 * a server that can share them.
 */
interface NotesState {
  note: Note | null;
  setNote: (text: string, music?: MusicTrack) => void;
  clearNote: () => void;
}

export const useNotesStore = create<NotesState>()(
  persist(
    (set) => ({
      note: null,
      setNote: (text, music) =>
        set({
          note: { text, music, createdAt: new Date().toISOString() },
        }),
      clearNote: () => set({ note: null }),
    }),
    {
      name: "instagramm-notes",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

/** True once a note is older than 24h, so callers can treat it as gone. */
export function isNoteExpired(note: Note) {
  return Date.now() - new Date(note.createdAt).getTime() > NOTE_LIFETIME_MS;
}
