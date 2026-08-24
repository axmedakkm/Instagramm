"use client";

import { useQueryClient } from "@tanstack/react-query";
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
import { ICE_SERVERS } from "@/lib/constants";


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
  /** Seconds since the call connected — 0 until `status` is "in-call". */
  callDuration: number;
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

interface SignalData {
  kind: "offer" | "answer" | "ice";
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

interface Session {
  /** Minted by the server's `call:initiate` ack and relayed to the callee in
   * `call:incoming` — the one id both peers share, so every socket relay
   * (accept/reject/end/signal) is addressed by it. */
  signalId: string;
  /** Prisma id of the persisted `calls` row. Only the caller ever learns it
   * (it comes back from `POST /chats/:id/calls`, and the server does not put
   * it in `call:incoming`), so the caller writes every REST status update —
   * for the callee, and for a caller whose row failed to write, it is null. */
  recordId: string | null;
  /** Set when `call:accepted` arrives before the history row does, so the
   * "answered" write can be replayed once `recordId` shows up. */
  acceptedBeforeRecord?: boolean;
  conversationId: string;
  role: "caller" | "callee";
  callType: CallType;
}

interface InitiateAck {
  ok: boolean;
  callId?: string;
  message?: string;
}

/** Turns a `getUserMedia` rejection into a message that tells the user what
 * actually went wrong instead of a generic failure. */
function describeMediaError(error: unknown, type: CallType): string {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
      return type === "video"
        ? "Camera and microphone access was denied. Allow them in your browser settings to make a video call."
        : "Microphone access was denied. Allow it in your browser settings to make a call.";
    }
    if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
      return type === "video"
        ? "No camera or microphone was found on this device."
        : "No microphone was found on this device.";
    }
  }
  return type === "video"
    ? "Couldn't access your camera/microphone."
    : "Couldn't access your microphone.";
}

type CallOutcome = "missed" | "declined" | "ended" | "failed";

/** The chat-log line for a call, e.g. "🎥 Video call · 2:05" or "📞 Missed voice call". */
function describeCallOutcome(
  type: CallType,
  outcome: CallOutcome,
  durationSeconds: number,
): string {
  const icon = type === "video" ? "🎥" : "📞";
  const label = type === "video" ? "Video call" : "Voice call";
  switch (outcome) {
    case "missed":
      return `${icon} Missed ${label.toLowerCase()}`;
    case "declined":
      return `${icon} ${label} declined`;
    case "failed":
      return `${icon} ${label} failed`;
    case "ended": {
      const minutes = Math.floor(durationSeconds / 60);
      const seconds = durationSeconds % 60;
      return `${icon} ${label} · ${minutes}:${seconds.toString().padStart(2, "0")}`;
    }
  }
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
  const queryClient = useQueryClient();

  const [status, setStatus] = useState<CallStatus>("idle");
  const [callType, setCallType] = useState<CallType | null>(null);
  const [peer, setPeer] = useState<UserSummary | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const sessionRef = useRef<Session | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  // Mirror `status`/`callDuration` into refs so socket handlers and
  // callbacks below can read the *current* value without needing them as
  // effect/callback dependencies (which would tear down and re-attach the
  // socket listeners on every tick of the call-duration counter).
  const statusRef = useRef<CallStatus>("idle");
  const callDurationRef = useRef(0);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    callDurationRef.current = callDuration;
  }, [callDuration]);

  const emit = useCallback(
    (event: string, payload: unknown) => {
      socket?.emit(event, payload);
    },
    [socket],
  );

  /** `call:initiate` is the only call event whose ack we need — it carries
   * the shared call id, and it is what actually rings the other side. */
  const initiateOverSocket = useCallback(
    (conversationId: string, type: CallType) =>
      new Promise<string>((resolve, reject) => {
        if (!socket) {
          reject(new Error("not connected"));
          return;
        }
        socket.emit(
          "call:initiate",
          { conversationId, callType: type },
          (ack: InitiateAck) => {
            if (ack?.ok && ack.callId) resolve(ack.callId);
            else reject(new Error(ack?.message ?? "call:initiate failed"));
          },
        );
      }),
    [socket],
  );

  /**
   * Drops a "📞 Missed call" / "🎥 Video call · 2:05" style line into the
   * conversation once a call ends, same as WhatsApp/Instagram's call log.
   * Only the caller's client ever calls this (see each call site) so a call
   * that ends independently on both peers — e.g. both sides observing
   * `RTCPeerConnection.connectionState` go to "failed" — doesn't double-post.
   */
  const logCallOutcome = useCallback(
    (conversationId: string, type: CallType, outcome: CallOutcome) => {
      const text = describeCallOutcome(type, outcome, callDurationRef.current);
      conversationsApi
        .sendMessage(conversationId, { text })
        .then((message) => {
          queryClient.setQueryData(
            queryKeys.conversations.messages(conversationId),
            (old: { items: Message[] } | undefined) => {
              if (!old) return old;
              if (old.items.some((item) => item.id === message.id)) return old;
              return { ...old, items: [...old.items, message] };
            },
          );
          queryClient.invalidateQueries({ queryKey: queryKeys.conversations.list });
        })
        .catch(() => {
          /* best-effort — the call itself already ended either way */
        });
    },
    [queryClient],
  );

  const cleanup = useCallback(() => {
    const pc = pcRef.current;
    if (pc) {
      // Detach every handler before closing so a late-firing event (e.g.
      // `onconnectionstatechange` reacting to our own `close()` call below)
      // can't re-enter this teardown or touch state after we've moved on.
      pc.onicecandidate = null;
      pc.ontrack = null;
      pc.onconnectionstatechange = null;
      pc.getSenders().forEach((sender) => {
        try {
          sender.track?.stop();
        } catch {
          /* noop */
        }
      });
      pc.close();
    }
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
    setCallDuration(0);
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
            callId: session.signalId,
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
          return;
        }
        if (
          pc.connectionState === "failed" ||
          pc.connectionState === "disconnected" ||
          pc.connectionState === "closed"
        ) {
          const session = sessionRef.current;
          if (!session) return; // already torn down by our own cleanup()
          if (pc.connectionState === "failed") {
            toast.error("Call connection failed.");
            if (session.role === "caller") {
              logCallOutcome(session.conversationId, session.callType, "failed");
            }
          }
          emit("call:end", {
            callId: session.signalId,
            conversationId: session.conversationId,
          });
          if (session.recordId) {
            callsApi.end(session.recordId).catch(() => {
              /* best-effort — the peer connection is already torn down */
            });
          }
          cleanup();
        }
      };

      pcRef.current = pc;
      return pc;
    },
    [emit, cleanup, logCallOutcome],
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

      setCallType(type);
      setPeer(targetPeer);
      setStatus("calling");

      let stream: MediaStream;
      try {
        stream = await getMedia(type);
      } catch (error) {
        toast.error(describeMediaError(error, type));
        cleanup();
        return;
      }

      let signalId: string;
      try {
        // This is the part that actually rings the callee: the server relays
        // `call:incoming` to the conversation's other participants.
        signalId = await initiateOverSocket(conversationId, type);
      } catch {
        toast.error("Couldn't start the call.");
        cleanup();
        return;
      }

      sessionRef.current = {
        signalId,
        recordId: null,
        conversationId,
        role: "caller",
        callType: type,
      };
      createPeerConnection(stream);

      // History row only. The call is already ringing by now, so failing here
      // costs a row, not the call — `recordId` stays null and the REST status
      // updates below are skipped.
      try {
        const record = await callsApi.start(conversationId, type);
        const session = sessionRef.current;
        if (!session || session.signalId !== signalId) {
          // The call was over before the row came back — close it so it does
          // not sit at "ringing" forever.
          callsApi.end(record.callId).catch(() => {});
          return;
        }
        session.recordId = record.callId;
        if (session.acceptedBeforeRecord) {
          callsApi.answer(record.callId, "accept").catch(() => {});
        }
      } catch {
        /* no history row for this call */
      }
    },
    [socket, getMedia, initiateOverSocket, createPeerConnection, cleanup],
  );

  const acceptCall = useCallback(async () => {
    const session = sessionRef.current;
    if (!session || session.role !== "callee") return;
    setStatus("connecting");

    let stream: MediaStream;
    try {
      stream = await getMedia(session.callType);
    } catch (error) {
      toast.error(describeMediaError(error, session.callType));
      emit("call:reject", {
        callId: session.signalId,
        conversationId: session.conversationId,
      });
      cleanup();
      return;
    }

    try {
      createPeerConnection(stream);
      // The caller creates the offer once it hears call:accepted, and writes
      // the REST status update — we have no `recordId` on this side.
      emit("call:accept", {
        callId: session.signalId,
        conversationId: session.conversationId,
      });
    } catch {
      toast.error("Couldn't accept the call.");
      emit("call:reject", {
        callId: session.signalId,
        conversationId: session.conversationId,
      });
      cleanup();
    }
  }, [emit, getMedia, createPeerConnection, cleanup]);

  const rejectCall = useCallback(() => {
    const session = sessionRef.current;
    if (session) {
      emit("call:reject", {
        callId: session.signalId,
        conversationId: session.conversationId,
      });
    }
    cleanup();
  }, [emit, cleanup]);

  const endCall = useCallback(() => {
    const session = sessionRef.current;
    if (session) {
      emit("call:end", {
        callId: session.signalId,
        conversationId: session.conversationId,
      });
      if (session.recordId) callsApi.end(session.recordId).catch(() => {});
      if (session.role === "caller") {
        logCallOutcome(
          session.conversationId,
          session.callType,
          statusRef.current === "in-call" ? "ended" : "missed",
        );
      }
    }
    cleanup();
  }, [emit, cleanup, logCallOutcome]);

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
        socket.emit("call:reject", {
          callId: data.callId,
          conversationId: data.conversationId,
        });
        return;
      }
      sessionRef.current = {
        signalId: data.callId,
        recordId: null,
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
      // The callee accepted but cannot write the row, so we do it here — or
      // leave a note for startCall if the row has not come back yet.
      if (session.recordId) {
        callsApi.answer(session.recordId, "accept").catch(() => {});
      } else {
        session.acceptedBeforeRecord = true;
      }
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("call:signal", {
          callId: session.signalId,
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
              callId: session.signalId,
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
      const session = sessionRef.current;
      if (!session) return;
      toast("Call declined.");
      if (session.recordId) {
        callsApi.answer(session.recordId, "reject").catch(() => {});
      }
      if (session.role === "caller") {
        logCallOutcome(session.conversationId, session.callType, "declined");
      }
      cleanup();
    };

    // The peer hung up. Only the caller holds the row, so only it closes one.
    const onEnded = () => {
      const session = sessionRef.current;
      if (session?.recordId) callsApi.end(session.recordId).catch(() => {});
      // Only the caller logs a call-log message (see `logCallOutcome`) — if
      // *we're* the caller, the other side (callee) just ended an in-call or
      // never picked up.
      if (session && session.role === "caller") {
        logCallOutcome(
          session.conversationId,
          session.callType,
          statusRef.current === "in-call" ? "ended" : "missed",
        );
      }
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
  }, [socket, drainPendingCandidates, cleanup, endCall, logCallOutcome]);

  // Tear the call down if the socket drops entirely.
  useEffect(() => {
    if (!socket && sessionRef.current) cleanup();
  }, [socket, cleanup]);

  // Live call-duration counter, ticking once a second while connected.
  // `cleanup()` already resets `callDuration` to 0 on every path that leaves
  // "in-call", so this effect only needs to own starting/stopping the timer.
  useEffect(() => {
    if (status !== "in-call") return;
    const startedAt = Date.now();
    const interval = setInterval(() => {
      setCallDuration(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [status]);

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
        callDuration,
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
