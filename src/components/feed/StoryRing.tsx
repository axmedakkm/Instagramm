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
        "inline-flex shrink-0 rounded-full p-[2px]",
        hasStory
          ? hasUnviewed
            ? "bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600"
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
