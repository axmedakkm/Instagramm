"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { SOCKET_URL } from "@/lib/constants";
import { useAuthStore } from "@/store/useAuthStore";

interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  isConnected: false,
});

/**
 * Owns a single Socket.IO connection (namespace "/chat") for the whole
 * authenticated app tree, so `ChatWindow`, `MessageInput`, the story reply
 * bar, etc. all share one transport instead of each opening its own.
 * Consume it via `useSocket()`.
 */
export function SocketProvider({ children }: { children: React.ReactNode }) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

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

    // The socket instance must live in state so consumers re-render once
    // it's ready to use.
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

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}

/** Falls back to short-polling (`refetchInterval`) when `isConnected` is false. */
export function useSocket() {
  return useContext(SocketContext);
}
