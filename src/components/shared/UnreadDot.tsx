import { cn } from "@/lib/utils";

/**
 * The "there's something new here" dot, in the brand gradient.
 *
 * Used on unread conversation rows and on the Messages nav item, so both say
 * the same thing the same way. It answers "is there anything?" — when the
 * actual number matters, use a count badge instead.
 */
export function UnreadDot({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "size-2.5 shrink-0 animate-pulse rounded-full bg-[linear-gradient(135deg,#ee2a7b,#6228d7)] shadow-[0_0_8px_rgba(238,42,123,0.6)]",
        className,
      )}
    />
  );
}
