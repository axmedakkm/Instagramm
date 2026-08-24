"use client";

import { isAxiosError } from "axios";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { useSocket } from "@/hooks/useSocket";
import { callsApi } from "@/services/api";
import type { CallType, UserSummary } from "@/types";

export type { CallType };
/** idle → (caller) calling → connecting → in-call. (callee) ringing → connecting → in-call. */
export type CallStatus = "idle" | "calling" | "ringing" | "connecting" | "in-call";

interface CallContextValue {
  status: CallStatus;
  callType: CallType | null;
  peer: UserSummary | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isCameraOff: boolean;
  startCall: (
    conversationId: string,
    callType: CallType,
    peer: UserSummary,
  ) => void;
  acceptCall: () => void;
  rejectCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleCamera: () => void;
}

const CallContext = createContext<CallContextValue | null>(null);

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

interface SignalData {
  kind: "offer" | "answer" | "ice";
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

interface Session {
  callId: string;
  conversationId: string;
  role: "caller" | "callee";
  callType: CallType;
}

/**
 * Owns 1:1 WebRTC audio/video calls. Call lifecycle (start/answer/end) goes
 * through the REST `/chats/:chatId/calls` + `/calls/:callId/{answer,end}`
 * endpoints, which persist the call record; the backend relays the
 * corresponding "call:incoming" / "call:accepted" / "call:rejected" /
 * "call:ended" notifications to the other participant over the "/chat"
 * socket. The SDP/ICE exchange itself still flows over that same socket
 * ("call:signal") — only the media flows peer-to-peer. Mount once inside
 * `SocketProvider` and read with `useCall()`.
 */
export function CallProvider({ children }: { children: React.ReactNode }) {
  const { socket } = useSocket();

  const [status, setStatus] = useState<CallStatus>("idle");
  const [callType, setCallType] = useState<CallType | null>(null);
  const [peer, setPeer] = useState<UserSummary | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  const sessionRef = useRef<Session | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);

  const emit = useCallback(
    (event: string, payload: unknown) => {
      socket?.emit(event, payload);
    },
    [socket],
  );

  const cleanup = useCallback(() => {
    pcRef.current?.getSenders().forEach((sender) => {
      try {
        sender.track?.stop();
      } catch {
        /* noop */
      }
    });
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    pendingCandidatesRef.current = [];
    sessionRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setStatus("idle");
    setCallType(null);
    setPeer(null);
    setIsMuted(false);
    setIsCameraOff(false);
  }, []);

  const getMedia = useCallback(async (type: CallType) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: type === "video",
    });
    localStreamRef.current = stream;
    setLocalStream(stream);
    return stream;
  }, []);

  const createPeerConnection = useCallback(
    (stream: MediaStream) => {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.onicecandidate = (event) => {
        const session = sessionRef.current;
        if (event.candidate && session) {
          emit("call:signal", {
            callId: session.callId,
            conversationId: session.conversationId,
            data: { kind: "ice", candidate: event.candidate.toJSON() },
          });
        }
      };

      pc.ontrack = (event) => {
        setRemoteStream(event.streams[0] ?? null);
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          setStatus("in-call");
        } else if (
          pc.connectionState === "failed" ||
          pc.connectionState === "disconnected" ||
          pc.connectionState === "closed"
        ) {
          const session = sessionRef.current;
          if (session) {
            callsApi.end(session.callId).catch(() => {
              /* best-effort — the peer connection is already torn down */
            });
          }
          cleanup();
        }
      };

      pcRef.current = pc;
      return pc;
    },
    [emit, cleanup],
  );

  const drainPendingCandidates = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc) return;
    const queued = pendingCandidatesRef.current;
    pendingCandidatesRef.current = [];
    for (const candidate of queued) {
      try {
        await pc.addIceCandidate(candidate);
      } catch {
        /* ignore late/duplicate candidates */
      }
    }
  }, []);

  const startCall = useCallback(
    async (conversationId: string, type: CallType, targetPeer: UserSummary) => {
      if (!socket) {
        toast.error("You're offline — can't start a call.");
        return;
      }
      if (sessionRef.current) return; // already in a call

      try {
        setCallType(type);
        setPeer(targetPeer);
        setStatus("calling");
        const stream = await getMedia(type);

        const call = await callsApi.start(conversationId, type);
        sessionRef.current = {
          callId: call.id,
          conversationId,
          role: "caller",
          callType: type,
        };
        createPeerConnection(stream);
      } catch (error) {
        toast.error(
          isAxiosError(error)
            ? ((error.response?.data as { message?: string })?.message ??
                "Couldn't start the call.")
            : "Couldn't access your camera/microphone.",
        );
        cleanup();
      }
    },
    [socket, getMedia, createPeerConnection, cleanup],
  );

  const acceptCall = useCallback(async () => {
    const session = sessionRef.current;
    if (!session || session.role !== "callee") return;
    try {
      setStatus("connecting");
      const stream = await getMedia(session.callType);
      createPeerConnection(stream);
      await callsApi.answer(session.callId, "accept");
      // The caller creates the offer once it hears call:accepted.
    } catch {
      toast.error("Couldn't access your camera/microphone.");
      callsApi.answer(session.callId, "reject").catch(() => {});
      cleanup();
    }
  }, [getMedia, createPeerConnection, cleanup]);

  const rejectCall = useCallback(() => {
    const session = sessionRef.current;
    if (session) {
      callsApi.answer(session.callId, "reject").catch(() => {});
    }
    cleanup();
  }, [cleanup]);

  const endCall = useCallback(() => {
    const session = sessionRef.current;
    if (session) {
      callsApi.end(session.callId).catch(() => {});
    }
    cleanup();
  }, [cleanup]);

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const enabled = stream.getAudioTracks().some((t) => t.enabled);
    stream.getAudioTracks().forEach((t) => (t.enabled = !enabled));
    setIsMuted(enabled);
  }, []);

  const toggleCamera = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const enabled = stream.getVideoTracks().some((t) => t.enabled);
    stream.getVideoTracks().forEach((t) => (t.enabled = !enabled));
    setIsCameraOff(enabled);
  }, []);

  // Wire up all incoming signaling events. Handlers read live call state from
  // refs, so this effect only needs to re-run when the socket changes.
  useEffect(() => {
    if (!socket) return;

    const onIncoming = (data: {
      callId: string;
      conversationId: string;
      callType: CallType;
      from: UserSummary;
    }) => {
      // Busy — auto-reject a second incoming call.
      if (sessionRef.current) {
        callsApi.answer(data.callId, "reject").catch(() => {});
        return;
      }
      sessionRef.current = {
        callId: data.callId,
        conversationId: data.conversationId,
        role: "callee",
        callType: data.callType,
      };
      setCallType(data.callType);
      setPeer(data.from);
      setStatus("ringing");
    };

    const onAccepted = async () => {
      const session = sessionRef.current;
      const pc = pcRef.current;
      if (!session || session.role !== "caller" || !pc) return;
      setStatus("connecting");
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("call:signal", {
          callId: session.callId,
          conversationId: session.conversationId,
          data: { kind: "offer", sdp: offer },
        });
      } catch {
        endCall();
      }
    };

    const onSignal = async (data: {
      from: UserSummary;
      data: SignalData;
    }) => {
      const pc = pcRef.current;
      if (!pc || !data?.data) return;
      const session = sessionRef.current;
      const payload = data.data;

      try {
        if (payload.kind === "offer" && payload.sdp) {
          await pc.setRemoteDescription(payload.sdp);
          await drainPendingCandidates();
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          if (session) {
            socket.emit("call:signal", {
              callId: session.callId,
              conversationId: session.conversationId,
              data: { kind: "answer", sdp: answer },
            });
          }
        } else if (payload.kind === "answer" && payload.sdp) {
          await pc.setRemoteDescription(payload.sdp);
          await drainPendingCandidates();
        } else if (payload.kind === "ice" && payload.candidate) {
          if (pc.remoteDescription) {
            await pc.addIceCandidate(payload.candidate);
          } else {
            pendingCandidatesRef.current.push(payload.candidate);
          }
        }
      } catch {
        /* ignore malformed/late signaling */
      }
    };

    const onRejected = () => {
      if (sessionRef.current) toast("Call declined.");
      cleanup();
    };

    const onEnded = () => {
      cleanup();
    };

    socket.on("call:incoming", onIncoming);
    socket.on("call:accepted", onAccepted);
    socket.on("call:signal", onSignal);
    socket.on("call:rejected", onRejected);
    socket.on("call:ended", onEnded);

    return () => {
      socket.off("call:incoming", onIncoming);
      socket.off("call:accepted", onAccepted);
      socket.off("call:signal", onSignal);
      socket.off("call:rejected", onRejected);
      socket.off("call:ended", onEnded);
    };
  }, [socket, drainPendingCandidates, cleanup, endCall]);

  // Tear the call down if the socket drops entirely.
  useEffect(() => {
    if (!socket && sessionRef.current) cleanup();
  }, [socket, cleanup]);

  return (
    <CallContext.Provider
      value={{
        status,
        callType,
        peer,
        localStream,
        remoteStream,
        isMuted,
        isCameraOff,
        startCall,
        acceptCall,
        rejectCall,
        endCall,
        toggleMute,
        toggleCamera,
      }}
    >
      {children}
    </CallContext.Provider>
  );
}

export function useCall() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCall must be used within a CallProvider");
  return ctx;
}
