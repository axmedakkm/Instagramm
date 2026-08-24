import { UserAvatar } from "@/components/shared/UserAvatar";
import { cn } from "@/lib/utils";
import type { User } from "@/types";

/**
 * Gradient ring around a user's avatar that reflects whether they have an
 * active story, and whether the current user has already viewed it.
 */
export function StoryRing({
  user,
  hasStory = false,
  hasUnviewed = false,
  size = "md",
  className,
}: {
  user: Pick<User, "username" | "avatarUrl">;
  hasStory?: boolean;
  hasUnviewed?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex shrink-0 rounded-full p-[2px] transition-transform duration-200 ease-spring",
        hasStory && "hover:scale-[1.04]",
        hasStory
          ? hasUnviewed
            ? "bg-[conic-gradient(from_180deg_at_50%_50%,#f9ce34_0deg,#ee2a7b_120deg,#6228d7_240deg,#f9ce34_360deg)]"
            : "bg-muted-foreground/30"
          : "bg-transparent",
        className,
      )}
    >
      <div className="rounded-full bg-background p-[2px]">
        <UserAvatar user={user} size={size === "xl" ? "xl" : size === "lg" ? "lg" : size === "sm" ? "sm" : "md"} />
      </div>
    </div>
  );
}
