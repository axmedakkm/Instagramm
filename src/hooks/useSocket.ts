"use client";

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { SOCKET_URL } from "@/lib/constants";
import { useAuthStore } from "@/store/useAuthStore";

/**
 * Connects to the realtime gateway and reuses a single socket instance for
 * the lifetime of the component tree that needs it (typically the messages
 * page). Callers should treat `isConnected === false` as a signal to fall
 * back to short-polling with React Query's `refetchInterval`.
 */
export function useSocket() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!accessToken) {
      setIsConnected(false);
      return;
    }

    const socket = io(SOCKET_URL, {
      auth: { token: accessToken },
      transports: ["websocket"],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);
    const handleError = () => setIsConnected(false);

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleError);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleError);
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [accessToken]);

  return { socket: socketRef.current, isConnected };
}
