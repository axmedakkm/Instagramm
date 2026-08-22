"use client";

import { ChevronLeft, LogOut, User as UserIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/store/useAuthStore";

export default function SettingsPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

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
          onClick={() => toast.info("Profile editing is coming soon.")}
          className="flex items-center gap-3 rounded-md px-3 py-3 text-sm transition-colors hover:bg-accent"
        >
          <UserIcon className="size-5" />
          Edit profile
        </button>

        <Separator className="my-1" />

        <button
          type="button"
          onClick={() => {
            logout();
            router.push("/login");
          }}
          className="flex items-center gap-3 rounded-md px-3 py-3 text-sm text-destructive transition-colors hover:bg-destructive/10"
        >
          <LogOut className="size-5" />
          Log out
        </button>
      </nav>
    </div>
  );
}
