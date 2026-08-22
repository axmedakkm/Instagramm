"use client";

import { ChevronLeft, Moon } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useThemeStore } from "@/store/useThemeStore";

export default function ThemePage() {
  const router = useRouter();
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);
  const isDark = theme === "dark";

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
        <h1 className="text-xl font-semibold">Theme</h1>
      </header>

      <div className="p-2">
        <label
          htmlFor="dark-mode"
          className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-3 transition-colors hover:bg-accent"
        >
          <Moon className="size-5" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Dark mode</p>
            <p className="text-xs text-muted-foreground">
              Switch the app between the light and dark colour scheme.
            </p>
          </div>
          <Switch
            id="dark-mode"
            checked={isDark}
            onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
            aria-label="Toggle dark mode"
          />
        </label>
      </div>
    </div>
  );
}
