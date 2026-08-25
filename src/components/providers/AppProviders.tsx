"use client";

import { useSyncExternalStore } from "react";
import { Toaster } from "sonner";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { useThemeStore } from "@/store/useThemeStore";

/** Single composition root for all client-side providers used app-wide. */
export function AppProviders({ children }: { children: React.ReactNode }) {
  const theme = useThemeStore((state) => state.theme);
  // The persisted theme is restored before React hydrates, so reading it on
  // the first render would disagree with the server-rendered HTML. This is
  // false on the server and through hydration, then true — no state written
  // from an effect, and no mismatch.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  return (
    <QueryProvider>
      {children}
      <Toaster
        position="bottom-center"
        richColors
        closeButton
        theme={mounted ? theme : "light"}
        toastOptions={{
          classNames: {
            toast: "rounded-xl border-border/60 shadow-float",
          },
        }}
      />
    </QueryProvider>
  );
}
