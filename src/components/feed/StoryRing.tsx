import { UserAvatar } from "@/components/shared/UserAvatar";
import { cn } from "@/lib/utils";
import type { User } from "@/types";

/**
 * Ring around a user's avatar, in one of three states:
 *
 *  - an unseen story  → the bright Instagram gradient
 *  - a story you've already watched → a plain grey ring
 *  - no story at all  → a quiet hairline ring, so the avatar still reads as
 *                       "ringed" rather than bare
 */
export function StoryRing({
  user,
  hasStory = false,
  hasUnviewed = false,
  size = "md",
  className,
  avatarClassName,
}: {
  user: Pick<User, "username" | "avatarUrl">;
  hasStory?: boolean;
  hasUnviewed?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  /** Extra classes for the avatar itself — e.g. a responsive size. */
  avatarClassName?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex shrink-0 rounded-full p-[2px] transition-transform duration-200 ease-spring",
        hasStory && "hover:scale-[1.04]",
        hasStory && hasUnviewed &&
          "bg-[conic-gradient(from_180deg_at_50%_50%,#f9ce34_0deg,#ee2a7b_120deg,#6228d7_240deg,#f9ce34_360deg)]",
        hasStory && !hasUnviewed && "bg-muted-foreground/40",
        !hasStory && "bg-border",
        className,
      )}
    >
      {/* Background-coloured gap between the ring and the photo, so the ring
          reads as a ring and not as a border on the image. */}
      <div className="rounded-full bg-background p-[2px]">
        <UserAvatar user={user} size={size} className={avatarClassName} />
      </div>
    </div>
  );
}
