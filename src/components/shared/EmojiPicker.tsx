"use client";

import { Smile } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** Small hand-picked set — the emoji people actually reach for on a photo,
 * grouped so the panel stays scannable without a search box. */
const EMOJI_GROUPS: { label: string; emojis: string[] }[] = [
  {
    label: "Reactions",
    emojis: ["❤️", "🙌", "🔥", "👏", "😍", "😮", "😂", "😢", "💯", "✨", "🥰", "😅"],
  },
  {
    label: "Smileys",
    emojis: ["😀", "😁", "😊", "🙂", "😉", "😌", "😎", "🤩", "🤔", "😴", "🥲", "🤗"],
  },
  {
    label: "Gestures",
    emojis: ["👍", "👎", "🤝", "🙏", "💪", "👀", "🫶", "✌️", "🤞", "👌", "🖤", "💜"],
  },
];

/**
 * A self-contained emoji panel anchored to its own trigger button. Deliberately
 * dependency-free: an emoji-mart-sized library would dwarf everything else on
 * the page for what is a 36-glyph grid.
 */
export function EmojiPicker({
  onSelect,
  className,
  align = "start",
}: {
  onSelect: (emoji: string) => void;
  className?: string;
  align?: "start" | "end";
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    // Capture phase, so Escape closes the panel before it closes the sheet
    // the panel is rendered inside.
    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [open]);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Add an emoji"
        aria-expanded={open}
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground transition-all duration-200 ease-spring hover:bg-accent hover:text-foreground active:scale-90",
          open && "bg-accent text-foreground",
        )}
      >
        <Smile className="size-5" />
      </button>

      {open && (
        <div
          className={cn(
            "enter-pop absolute bottom-full z-50 mb-2 w-[268px] rounded-xl border border-border/70 bg-popover p-2 shadow-float",
            align === "end" ? "right-0" : "left-0",
          )}
        >
          <div className="max-h-56 space-y-2 overflow-y-auto pr-0.5">
            {EMOJI_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.label}
                </p>
                <div className="grid grid-cols-6 gap-0.5">
                  {group.emojis.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        onSelect(emoji);
                        setOpen(false);
                      }}
                      className="grid size-9 place-items-center rounded-lg text-xl leading-none transition-transform duration-150 ease-spring hover:scale-125 hover:bg-accent active:scale-95"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
