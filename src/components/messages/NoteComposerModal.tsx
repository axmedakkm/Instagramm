"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { notesApi } from "@/services/api";
import { queryKeys } from "@/services/queryKeys";
import { useAuthStore } from "@/store/useAuthStore";
import type { MusicTrack, Note } from "@/types";

/** Instagram caps notes at 60 characters; so do we. */
const NOTE_MAX_LENGTH = 60;

/**
 * Write (or edit) the note that sits above your inbox. A note is a line of
 * text under 60 characters, optionally with a song. It's saved on the backend
 * so your followers can see it.
 */
export function NoteComposerModal({
  open,
  onOpenChange,
  note,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Your current note, so the form opens pre-filled. */
  note: Note | null;
}) {
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
  const queryClient = useQueryClient();
  const currentUsername = useAuthStore((state) => state.user?.username);

  const [text, setText] = useState(note?.text ?? "");
  const [music, setMusic] = useState<MusicTrack | null>(note?.music ?? null);

  const trimmed = text.trim();

  // Both actions refresh the messages rail and (so the profile bubble updates)
  // your own profile.
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.notes.list });
    if (currentUsername) {
      queryClient.invalidateQueries({
        queryKey: queryKeys.users.detail(currentUsername),
      });
    }
  };

  const shareMutation = useMutation({
    mutationFn: () => notesApi.create({ text: trimmed, music }),
    onSuccess: () => {
      toast.success("Note shared");
      refresh();
      onClose();
    },
    onError: () => toast.error("Couldn't share your note. Please try again."),
  });

  const deleteMutation = useMutation({
    mutationFn: () => notesApi.remove(),
    onSuccess: () => {
      toast.success("Note deleted");
      refresh();
      onClose();
    },
    onError: () => toast.error("Couldn't delete your note."),
  });

  const isBusy = shareMutation.isPending || deleteMutation.isPending;

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
          Notes disappear after 24 hours and are visible to people who follow
          you.
        </p>
      </div>

      <DialogFooter>
        {note && (
          <Button
            variant="ghost"
            disabled={isBusy}
            onClick={() => deleteMutation.mutate()}
          >
            Delete note
          </Button>
        )}
        <Button
          disabled={!trimmed || isBusy}
          onClick={() => shareMutation.mutate()}
        >
          Share
        </Button>
      </DialogFooter>
    </>
  );
}
