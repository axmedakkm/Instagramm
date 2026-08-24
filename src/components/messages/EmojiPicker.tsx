"use client";

import { Smile } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { COMMON_EMOJIS } from "@/lib/emoji";
import { cn } from "@/lib/utils";

/**
 * A small "😀" button that opens a flat grid of common emoji. No portal/
 * positioning library — just an absolutely-positioned panel anchored to the
 * button, closed on outside click or Escape.
 */
export function EmojiPicker({ onSelect }: { onSelect: (emoji: string) => void }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Add an emoji"
        aria-expanded={open}
        className={cn(
          "flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent",
          open && "bg-accent text-foreground",
        )}
      >
        <Smile className="size-5" />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 z-20 mb-2 w-64 rounded-xl border border-border bg-popover p-2 shadow-lg">
          <ScrollArea className="h-48">
            <div className="grid grid-cols-8 gap-0.5 pr-2">
              {COMMON_EMOJIS.map((emoji, index) => (
                <button
                  key={`${emoji}-${index}`}
                  type="button"
                  onClick={() => onSelect(emoji)}
                  className="flex size-7 items-center justify-center rounded-md text-lg transition-colors hover:bg-accent"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
