import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { User } from "@/types";

const SIZE_CLASSES = {
  xs: "size-7",
  sm: "size-8",
  md: "size-10",
  lg: "size-14",
  xl: "size-20",
} as const;

export function UserAvatar({
  user,
  size = "md",
  className,
}: {
  user: Pick<User, "username" | "avatarUrl">;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
}) {
  const initials = user.username.slice(0, 2).toUpperCase();

  return (
    <Avatar className={cn(SIZE_CLASSES[size], className)}>
      {user.avatarUrl && (
        <AvatarImage src={user.avatarUrl} alt={user.username} />
      )}
      <AvatarFallback>{initials}</AvatarFallback>
    </Avatar>
  );
}
