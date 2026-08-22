"use client";

import { Toaster } from "sonner";
import { QueryProvider } from "@/components/providers/QueryProvider";

/** Single composition root for all client-side providers used app-wide. */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      {children}
      <Toaster position="bottom-center" richColors closeButton />
    </QueryProvider>
  );
}
