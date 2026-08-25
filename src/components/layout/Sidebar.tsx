"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Film,
  Heart,
  Home,
  Camera,
  Menu,
  MessageCircle,
  PlusSquare,
  Search,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AccountMenuContent } from "@/components/layout/AccountMenuContent";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { DropdownMenu, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
    <aside className="glass fixed inset-y-0 left-0 z-40 hidden w-[72px] flex-col border-r border-border/60 px-3 py-6 xl:w-64 lg:flex">
      <Link
        href="/feed"
        className="mb-8 flex items-center gap-2 px-2 text-xl font-bold transition-opacity duration-200 ease-smooth hover:opacity-70"
      >
        <Camera className="size-7 shrink-0" />
        <span className="brand-gradient hidden xl:inline">Instagramm</span>
      </Link>

      <nav className="flex flex-1 flex-col gap-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-4 rounded-lg px-3 py-3 text-base transition-all duration-200 ease-smooth hover:bg-accent active:scale-[0.98]",
                isActive && "bg-accent font-bold",
              )}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-full bg-[linear-gradient(180deg,#f9ce34,#ee2a7b,#6228d7)]" />
              )}
              <item.icon
                className={cn(
                  "size-6 shrink-0 transition-transform duration-200 ease-spring group-hover:scale-110",
                  isActive && "scale-110",
                )}
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
          className="flex items-center gap-4 rounded-lg px-3 py-3 text-base transition-all duration-200 ease-smooth hover:bg-accent active:scale-[0.98]"
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

        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="mt-auto flex items-center gap-4 rounded-lg px-3 py-3 text-base transition-all duration-200 ease-smooth hover:bg-accent active:scale-[0.98]"
              >
                <Menu className="size-6 shrink-0" />
                <span className="hidden xl:inline">More</span>
              </button>
            </DropdownMenuTrigger>
            <AccountMenuContent />
          </DropdownMenu>
        )}
      </nav>
    </aside>
  );
}
