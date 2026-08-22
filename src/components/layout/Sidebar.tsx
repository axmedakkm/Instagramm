"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Compass,
  Film,
  Heart,
  Home,
  Instagram,
  MessageCircle,
  PlusSquare,
  Search,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { cn } from "@/lib/utils";
import { notificationsApi } from "@/services/api";
import { queryKeys } from "@/services/queryKeys";
import { useAuthStore } from "@/store/useAuthStore";
import { useUIStore } from "@/store/useUIStore";

export function Sidebar() {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const openCreatePost = useUIStore((state) => state.openCreatePost);

  const { data: notifications } = useQuery({
    queryKey: queryKeys.notifications.list,
    queryFn: () => notificationsApi.list(),
    staleTime: 15 * 1000,
    refetchInterval: 30 * 1000,
  });

  const unreadCount =
    notifications?.items.filter((notification) => !notification.isRead)
      .length ?? 0;

  const navItems = [
    { href: "/feed", label: "Home", icon: Home },
    { href: "/explore", label: "Search", icon: Search },
    { href: "/explore", label: "Explore", icon: Compass },
    { href: "/reels", label: "Reels", icon: Film },
    { href: "/messages", label: "Messages", icon: MessageCircle },
    {
      href: "/notifications",
      label: "Notifications",
      icon: Heart,
      badge: unreadCount,
    },
  ];

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[72px] flex-col border-r border-border bg-background px-3 py-6 xl:w-64 lg:flex">
      <Link
        href="/feed"
        className="mb-8 flex items-center gap-2 px-2 text-xl font-bold"
      >
        <Instagram className="size-7 shrink-0" />
        <span className="hidden xl:inline">Instagramm</span>
      </Link>

      <nav className="flex flex-1 flex-col gap-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "relative flex items-center gap-4 rounded-lg px-3 py-3 text-base transition-colors hover:bg-accent",
                isActive && "font-bold",
              )}
            >
              <item.icon
                className="size-6 shrink-0"
                fill={isActive ? "currentColor" : "none"}
              />
              <span className="hidden xl:inline">{item.label}</span>
              {!!item.badge && (
                <span className="absolute left-6 top-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-destructive-foreground xl:static xl:ml-auto">
                  {item.badge > 9 ? "9+" : item.badge}
                </span>
              )}
            </Link>
          );
        })}

        <button
          type="button"
          onClick={openCreatePost}
          className="flex items-center gap-4 rounded-lg px-3 py-3 text-base transition-colors hover:bg-accent"
        >
          <PlusSquare className="size-6 shrink-0" />
          <span className="hidden xl:inline">Create</span>
        </button>

        {user && (
          <Link
            href={`/${user.username}`}
            className={cn(
              "flex items-center gap-4 rounded-lg px-3 py-3 text-base transition-colors hover:bg-accent",
              pathname === `/${user.username}` && "font-bold",
            )}
          >
            <UserAvatar user={user} size="xs" />
            <span className="hidden xl:inline">Profile</span>
          </Link>
        )}
      </nav>
    </aside>
  );
}
