"use client";

import { Compass, Heart, Home, MessageCircle, PlusSquare } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";
import { useUIStore } from "@/store/useUIStore";

export function MobileNav() {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const openCreatePost = useUIStore((state) => state.openCreatePost);

  const navItems = [
    { href: "/feed", label: "Home", icon: Home },
    { href: "/explore", label: "Explore", icon: Compass },
    { href: "/messages", label: "Messages", icon: MessageCircle },
    { href: "/notifications", label: "Notifications", icon: Heart },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex h-14 items-center justify-around border-t border-border bg-background lg:hidden">
      {navItems.slice(0, 2).map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex h-full flex-1 items-center justify-center"
          >
            <item.icon
              className="size-6"
              fill={isActive ? "currentColor" : "none"}
            />
          </Link>
        );
      })}

      <button
        type="button"
        onClick={openCreatePost}
        className="flex h-full flex-1 items-center justify-center"
      >
        <PlusSquare className="size-6" />
      </button>

      {navItems.slice(2).map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex h-full flex-1 items-center justify-center"
          >
            <item.icon
              className="size-6"
              fill={isActive ? "currentColor" : "none"}
            />
          </Link>
        );
      })}

      {user && (
        <Link
          href={`/${user.username}`}
          className="flex h-full flex-1 items-center justify-center"
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
