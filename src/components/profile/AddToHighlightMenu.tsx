"use client";

import { BookmarkPlus, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useHighlightsStore } from "@/store/useHighlightsStore";

/**
 * "Add to highlight" for a single archived story: pick an existing highlight
 * from the menu, or create a new one holding just this story.
 */
export function AddToHighlightMenu({ storyId }: { storyId: string }) {
  const highlights = useHighlightsStore((state) => state.highlights);
  const addStories = useHighlightsStore((state) => state.addStories);
  const [newOpen, setNewOpen] = useState(false);

  const handleAdd = (highlightId: string, title: string) => {
    addStories(highlightId, [storyId]);
    toast.success(`Added to ${title}`);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            aria-label="Add to highlight"
          >
            <BookmarkPlus className="size-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {highlights.map((highlight) => {
            const alreadyIn = highlight.storyIds.includes(storyId);
            return (
              <DropdownMenuItem
                key={highlight.id}
                disabled={alreadyIn}
                onClick={() => handleAdd(highlight.id, highlight.title)}
              >
                {alreadyIn && <Check className="size-4" />}
                {highlight.title}
              </DropdownMenuItem>
            );
          })}
          {highlights.length > 0 && <DropdownMenuSeparator />}
          <DropdownMenuItem onClick={() => setNewOpen(true)}>
            New highlight
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <NewHighlightDialog
        storyId={storyId}
        open={newOpen}
        onOpenChange={setNewOpen}
      />
    </>
  );
}

function NewHighlightDialog({
  storyId,
  open,
  onOpenChange,
}: {
  storyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createHighlight = useHighlightsStore((state) => state.create);
  const [title, setTitle] = useState("");

  const handleCreate = () => {
    const name = title.trim();
    if (!name) return;
    createHighlight(name, [storyId]);
    toast.success("Highlight created");
    setTitle("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>New highlight</DialogTitle>
        </DialogHeader>

        <Input
          autoFocus
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && handleCreate()}
          placeholder="Highlight name"
          maxLength={30}
        />

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!title.trim()} onClick={handleCreate}>
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
