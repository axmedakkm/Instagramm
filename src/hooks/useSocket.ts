"use client";

import { useEffect, useState } from "react";
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
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    // The realtime gateway is mounted on the "/chat" Socket.IO namespace,
    // not the root namespace.
    const nextSocket = io(`${SOCKET_URL}/chat`, {
      auth: { token: accessToken },
      transports: ["websocket"],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);
    const handleError = () => setIsConnected(false);

    nextSocket.on("connect", handleConnect);
    nextSocket.on("disconnect", handleDisconnect);
    nextSocket.on("connect_error", handleError);

    // The socket instance itself must live in state (not a ref) so
    // consumers re-render once it's ready to use; this is the recommended
    // shape for exposing a newly-created external-system handle to render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSocket(nextSocket);

    return () => {
      nextSocket.off("connect", handleConnect);
      nextSocket.off("disconnect", handleDisconnect);
      nextSocket.off("connect_error", handleError);
      nextSocket.disconnect();
      setSocket(null);
      setIsConnected(false);
    };
  }, [accessToken]);

  return { socket, isConnected };
}
