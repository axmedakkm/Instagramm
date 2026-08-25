"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Film,
  Heart,
  Home,
  Menu,
  MessageCircle,
  PlusSquare,
  Search,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { AccountMenuContent } from "@/components/layout/AccountMenuContent";
import { BrandMark } from "@/components/shared/BrandMark";
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

  // Collapsed by default; opens while the pointer is over it. `onFocus` /
  // `onBlur` are here so tabbing through the links opens it too — a
  // hover-only sidebar is unusable from the keyboard. Both events bubble up
  // from the children in React, so one handler on the <aside> covers all of
  // them.
  const [isExpanded, setIsExpanded] = useState(false);

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
    <aside
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
      onFocus={() => setIsExpanded(true)}
      onBlur={() => setIsExpanded(false)}
      className={cn(
        // `overflow-hidden` is what makes this work: the labels are always
        // in the DOM at full width and simply get clipped while narrow, so
        // they slide out from under the edge instead of popping in.
        "glass fixed inset-y-0 left-0 z-40 hidden flex-col overflow-hidden border-r border-border/60 px-3 py-6 transition-[width,box-shadow] duration-300 ease-smooth lg:flex",
        isExpanded ? "w-64 shadow-float" : "w-[72px]",
      )}
    >
      <Link
        href="/feed"
        className="mb-8 flex items-center gap-2 px-2 text-xl font-bold transition-opacity duration-200 ease-smooth hover:opacity-70"
      >
        <BrandMark className="size-7 shrink-0" />
        <NavLabel show={isExpanded}>
          <span className="brand-gradient">Instagramm</span>
        </NavLabel>
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
              <NavLabel show={isExpanded}>{item.label}</NavLabel>
              {/* Pinned to the icon in both states — a badge that jumps to the
                  far right as the panel opens reads as a glitch. */}
              {!!item.badge && (
                <span className="absolute left-6 top-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-destructive-foreground">
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
          <NavLabel show={isExpanded}>Create</NavLabel>
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
            <NavLabel show={isExpanded}>Profile</NavLabel>
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
                <NavLabel show={isExpanded}>More</NavLabel>
              </button>
            </DropdownMenuTrigger>
            <AccountMenuContent />
          </DropdownMenu>
        )}
      </nav>
    </aside>
  );
}

/**
 * A sidebar label that slides in as the panel opens.
 *
 * It stays in the DOM in both states — hiding it with `display: none` would
 * make it un-animatable, and would also drop it out of the accessibility
 * tree, so a screen reader would read a nav of unlabelled icons. Fading it
 * keeps the text readable to assistive tech the whole time.
 */
function NavLabel({
  show,
  children,
}: {
  show: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "whitespace-nowrap transition-[opacity,transform] duration-200 ease-smooth",
        show ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0",
      )}
    >
      {children}
    </span>
  );
}
