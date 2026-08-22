"use client";

import { Bookmark, ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function SavedPage() {
  const router = useRouter();

  return (
    <div className="mx-auto w-full max-w-3xl">
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
        <div>
          <h1 className="text-xl font-semibold">Saved</h1>
          <p className="text-xs text-muted-foreground">
            Only you can see what you&apos;ve saved
          </p>
        </div>
      </header>

      {/* No saved posts to show yet — the save endpoint isn't wired up on the
          backend, so this page just renders the empty state for now. */}
      <div className="flex flex-col items-center justify-center gap-4 px-4 py-24 text-center">
        <div className="flex size-20 items-center justify-center rounded-full border-2 border-foreground">
          <Bookmark className="size-9" />
        </div>
        <div className="space-y-1">
          <h2 className="text-2xl font-light">Save videos</h2>
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">
            Save videos and posts you want to watch again. No one is notified,
            and only you can see what you&apos;ve saved.
          </p>
        </div>
      </div>
    </div>
  );
}
