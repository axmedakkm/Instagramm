"use client";

import { useState } from "react";
import { toast } from "sonner";
import { MusicPicker } from "@/components/shared/MusicPicker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { NOTE_MAX_LENGTH, useNotesStore, type Note } from "@/store/useNotesStore";
import type { StoryMusic } from "@/store/useStoryArchiveStore";

/**
 * Write (or edit) the note that sits above your inbox. A note is a line of
 * text under 60 characters, optionally with a song attached.
 */
export function NoteComposerModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const note = useNotesStore((state) => state.note);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New note</DialogTitle>
        </DialogHeader>

        {/* The form is its own component so it mounts fresh every time the
            dialog opens. That lets `useState` seed itself from the saved note
            directly — no effect needed to copy the note into the form. */}
        <NoteForm note={note} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function NoteForm({ note, onClose }: { note: Note | null; onClose: () => void }) {
  const setNote = useNotesStore((state) => state.setNote);
  const clearNote = useNotesStore((state) => state.clearNote);

  const [text, setText] = useState(note?.text ?? "");
  const [music, setMusic] = useState<StoryMusic | null>(note?.music ?? null);

  const trimmed = text.trim();

  const handleShare = () => {
    if (!trimmed) return;
    setNote(trimmed, music ?? undefined);
    toast.success("Note shared");
    onClose();
  };

  const handleDelete = () => {
    clearNote();
    toast.success("Note deleted");
    onClose();
  };

  return (
    <>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Textarea
            autoFocus
            value={text}
            // Cap the length here as well as on the element, so a paste can't
            // slip past `maxLength`.
            onChange={(event) =>
              setText(event.target.value.slice(0, NOTE_MAX_LENGTH))
            }
            maxLength={NOTE_MAX_LENGTH}
            placeholder="Share a thought..."
            className="min-h-20 resize-none"
          />
          <p className="text-right text-xs tabular-nums text-muted-foreground">
            {text.length}/{NOTE_MAX_LENGTH}
          </p>
        </div>

        <div className="border-t border-border pt-4">
          <MusicPicker
            value={music}
            onChange={setMusic}
            label="Add music to your note"
          />
        </div>

        <p className="text-xs text-muted-foreground">
          Notes disappear after 24 hours.
        </p>
      </div>

      <DialogFooter>
        {note && (
          <Button variant="ghost" onClick={handleDelete}>
            Delete note
          </Button>
        )}
        <Button disabled={!trimmed} onClick={handleShare}>
          Share
        </Button>
      </DialogFooter>
    </>
  );
}
