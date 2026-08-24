"use client";

import { useMutation } from "@tanstack/react-query";
import { ChevronLeft, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { usersApi } from "@/services/api";
import { useAuthStore } from "@/store/useAuthStore";

export default function PrivacyPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  const mutation = useMutation({
    mutationFn: (isPrivate: boolean) => usersApi.updateProfile({ isPrivate }),
    onSuccess: (updated) => {
      setUser(updated);
      toast.success(
        updated.isPrivate
          ? "Your account is now private."
          : "Your account is now public.",
      );
    },
    onError: () => toast.error("Couldn't update your privacy setting."),
  });

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
        <h1 className="text-xl font-semibold">Account privacy</h1>
      </header>

      <div className="p-2">
        <label
          htmlFor="private-account"
          className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-3 transition-colors hover:bg-accent"
        >
          <Lock className="size-5" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Private account</p>
            <p className="text-xs text-muted-foreground">
              When your account is private, only people you approve can see your
              posts and followers.
            </p>
          </div>
          <Switch
            id="private-account"
            checked={user?.isPrivate ?? false}
            disabled={!user || mutation.isPending}
            onCheckedChange={(checked) => mutation.mutate(checked)}
            aria-label="Toggle private account"
          />
        </label>
      </div>
    </div>
  );
}
