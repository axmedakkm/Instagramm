"use client";

import {
  Archive,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Lock,
  LogOut,
  Moon,
  User as UserIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { EditProfileModal } from "@/components/profile/EditProfileModal";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAccountsStore } from "@/store/useAccountsStore";
import { useAuthStore } from "@/store/useAuthStore";

export default function SettingsPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [editOpen, setEditOpen] = useState(false);
  const logout = useAuthStore((state) => state.logout);
  const forgetAccount = useAccountsStore((state) => state.forget);

  return (
    <div className="mx-auto w-full max-w-xl">
      <header className="flex items-center gap-2 border-b border-border px-4 py-4">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Go back"
          className="size-8"
          onClick={() => router.back()}
        >
          <ChevronLeft className="size-5" />
        </Button>
        <h1 className="text-xl font-semibold">Settings</h1>
      </header>

      {user && (
        <div className="flex items-center gap-4 px-4 py-6">
          <UserAvatar user={user} size="lg" />
          <div className="min-w-0">
            <p className="truncate font-semibold">{user.username}</p>
            <p className="truncate text-sm text-muted-foreground">
              {user.fullName}
            </p>
          </div>
        </div>
      )}

      <Separator />

      <nav className="flex flex-col p-2">
        <button
          type="button"
          onClick={() => setEditOpen(true)}
          className="flex items-center gap-3 rounded-md px-3 py-3 text-sm transition-colors hover:bg-accent"
        >
          <UserIcon className="size-5" />
          Edit profile
        </button>

        <button
          type="button"
          onClick={() => router.push("/saved")}
          className="flex items-center gap-3 rounded-md px-3 py-3 text-sm transition-colors hover:bg-accent"
        >
          <Bookmark className="size-5" />
          Saved
          <ChevronRight className="ml-auto size-4 text-muted-foreground" />
        </button>

        <button
          type="button"
          onClick={() => router.push("/settings/theme")}
          className="flex items-center gap-3 rounded-md px-3 py-3 text-sm transition-colors hover:bg-accent"
        >
          <Moon className="size-5" />
          Theme
          <ChevronRight className="ml-auto size-4 text-muted-foreground" />
        </button>

        <button
          type="button"
          onClick={() => router.push("/settings/privacy")}
          className="flex items-center gap-3 rounded-md px-3 py-3 text-sm transition-colors hover:bg-accent"
        >
          <Lock className="size-5" />
          Account privacy
          <ChevronRight className="ml-auto size-4 text-muted-foreground" />
        </button>

        <button
          type="button"
          onClick={() => router.push("/settings/archive")}
          className="flex items-center gap-3 rounded-md px-3 py-3 text-sm transition-colors hover:bg-accent"
        >
          <Archive className="size-5" />
          Story archive
          <ChevronRight className="ml-auto size-4 text-muted-foreground" />
        </button>

        <Separator className="my-1" />

        <button
          type="button"
          onClick={() => {
            // A real "log out" drops the account from the switcher too —
            // unlike `AccountMenuContent`'s "Add account", which also calls
            // `logout()` to clear the active session but keeps the account
            // remembered so you can switch straight back to it.
            if (user) forgetAccount(user.id);
            logout();
            router.push("/login");
          }}
          className="flex items-center gap-3 rounded-md px-3 py-3 text-sm text-destructive transition-colors hover:bg-destructive/10"
        >
          <LogOut className="size-5" />
          Log out
        </button>
      </nav>

      {user && (
        <EditProfileModal
          user={user}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
      )}
    </div>
  );
}
