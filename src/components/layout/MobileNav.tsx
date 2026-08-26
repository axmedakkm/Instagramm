"use client";

import { Compass, Heart, Home, MessageCircle, PlusSquare } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UnreadDot } from "@/components/shared/UnreadDot";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { useTranslation } from "@/i18n/useTranslation";
import { useUnreadCounts } from "@/hooks/useUnreadCounts";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";

export function MobileNav() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);

  const { unreadMessages, unreadNotifications } = useUnreadCounts();

  const navItems = [
    { href: "/feed", label: t("nav.home"), icon: Home },
    { href: "/explore", label: t("nav.explore"), icon: Compass },
    {
      href: "/messages",
      label: t("nav.messages"),
      icon: MessageCircle,
      hasDot: unreadMessages > 0,
    },
    {
      href: "/notifications",
      label: t("nav.notifications"),
      icon: Heart,
      badge: unreadNotifications,
    },
  ];

  return (
    <nav className="glass fixed inset-x-0 bottom-0 z-40 flex h-14 items-center justify-around border-t border-border/60 pb-[env(safe-area-inset-bottom)] lg:hidden">
      {navItems.slice(0, 2).map((item) => (
        <NavLink key={item.href} item={item} isActive={pathname === item.href} />
      ))}

      <Link
        href="/create"
        aria-label={t("nav.create")}
        className="flex h-full flex-1 items-center justify-center transition-transform duration-150 ease-smooth active:scale-90"
      >
        <PlusSquare className="size-6" />
      </Link>

      {navItems.slice(2).map((item) => (
        <NavLink key={item.href} item={item} isActive={pathname === item.href} />
      ))}

      {user && (
        <Link
          href={`/${user.username}`}
          className="flex h-full flex-1 items-center justify-center transition-transform duration-150 ease-smooth active:scale-90"
        >
          <UserAvatar
            user={user}
            size="xs"
            className={cn(
              pathname === `/${user.username}` && "ring-2 ring-foreground",
            )}
          />
        </Link>
      )}
    </nav>
  );
}

/**
 * One tab in the bottom bar. Both halves of the row render the same thing —
 * the Create button just sits between them — so this lives in one place.
 */
function NavLink({
  item,
  isActive,
}: {
  item: {
    href: string;
    label: string;
    icon: React.ElementType;
    hasDot?: boolean;
    badge?: number;
  };
  isActive: boolean;
}) {
  return (
    <Link
      href={item.href}
      aria-label={item.label}
      className="relative flex h-full flex-1 items-center justify-center transition-transform duration-150 ease-smooth active:scale-90"
    >
      {isActive && (
        <span className="absolute top-1 size-1 rounded-full bg-[linear-gradient(90deg,#f9ce34,#ee2a7b,#6228d7)]" />
      )}
      <item.icon
        className={cn(
          "size-6 transition-transform duration-200 ease-spring",
          isActive && "scale-110",
        )}
        fill={isActive ? "currentColor" : "none"}
      />
      {item.hasDot && (
        <UnreadDot className="absolute right-[calc(50%-0.9rem)] top-3" />
      )}
      {!!item.badge && (
        <span className="absolute right-[calc(50%-1.25rem)] top-2 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
          {item.badge > 9 ? "9+" : item.badge}
        </span>
      )}
    </Link>
  );
}
