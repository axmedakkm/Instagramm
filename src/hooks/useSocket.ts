"use client";

/**
 * Re-exported from `SocketProvider` so every consumer shares the same
 * underlying connection instead of each hook call opening a new one — see
 * `src/components/providers/SocketProvider.tsx` for the implementation.
 */
export { useSocket } from "@/components/providers/SocketProvider";
