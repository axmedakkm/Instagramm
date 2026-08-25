import { Music } from "lucide-react";
import type { Note } from "@/store/useNotesStore";

/**
 * The little speech-bubble pill that shows a note's text above someone's
 * avatar, with a small tail pointing down. Shared by every place a note can
 * appear — the messages rail, the feed's stories bar, and your own profile
 * header — so the look stays identical everywhere.
 */
export function NoteBubble({
  note,
  className = "",
}: {
  note: Note;
  className?: string;
}) {
  return (
    <span
      className={`relative block w-full rounded-2xl bg-secondary px-2 py-1.5 text-[10px] font-medium leading-tight text-secondary-foreground ${className}`}
    >
      <span className="line-clamp-2 block break-words">{note.text}</span>

      {note.music && (
        <span className="mt-0.5 flex items-center gap-1 text-[9px] text-muted-foreground">
          <Music className="size-2.5 shrink-0" />
          <span className="truncate">{note.music.title}</span>
        </span>
      )}

      <span className="absolute -bottom-[3px] left-1/2 size-2 -translate-x-1/2 rotate-45 rounded-[1px] bg-secondary" />
    </span>
  );
}
