"use client";

import { useQueryClient } from "@tanstack/react-query";
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
import { callsApi, conversationsApi } from "@/services/api";
import { queryKeys } from "@/services/queryKeys";
import type { CallType, Message, UserSummary } from "@/types";

export type { CallType };
/** idle → (caller) calling → connecting → in-call. (callee) ringing → connecting → in-call. */
export type CallStatus = "idle" | "calling" | "ringing" | "connecting" | "in-call";

/** One other person currently connected in the call, and their media. */
export interface RemoteParticipant {
  user: UserSummary;
  stream: MediaStream | null;
}

interface CallContextValue {
  status: CallStatus;
  callType: CallType | null;
  /** Who's ringing you (callee) or who you rang (caller) — display identity
   * for the pre-connect screen. For a group call this is just whoever's
   * relevant to that event, not the full roster; once connected, read
   * `remoteParticipants` instead. */
  peer: UserSummary | null;
  isGroup: boolean;
  localStream: MediaStream | null;
  /** Everyone actually connected right now — one entry per open
   * RTCPeerConnection, so length 1 for a normal 1:1 call. */
  remoteParticipants: RemoteParticipant[];
  isMuted: boolean;
  isCameraOff: boolean;
  /** Seconds since the call connected — 0 until `status` is "in-call". */
  callDuration: number;
  startCall: (
    conversationId: string,
    callType: CallType,
    peers: UserSummary[],
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
  /** Minted by the server's `call:initiate` ack and relayed to everyone else
   * in `call:incoming` — the one id every socket relay (accept/reject/end/
   * signal) is addressed by. */
  signalId: string;
  /** Prisma id of the persisted `calls` row. Only the caller ever learns it
   * (it comes back from `POST /chats/:id/calls`), so the caller writes every
   * REST status update — for a callee, and for a caller whose row failed to
   * write, it stays null. */
  recordId: string | null;
  /** Set when `call:accepted` arrives before the history row does, so the
   * "answered" write can be replayed once `recordId` shows up. */
  acceptedBeforeRecord?: boolean;
  /** Whether the REST row has already been marked "ongoing" — only the
   * *first* accept should do that, group calls fire `call:accepted` again
   * for every later joiner. */
  answered?: boolean;
  conversationId: string;
  role: "caller" | "callee";
  callType: CallType;
  /** More than one other participant was rung. Only changes how a reject
   * is handled — a decline in a group call doesn't end it for everyone
   * else still ringing or already connected. */
  isGroup: boolean;
}

interface InitiateAck {
  ok: boolean;
  callId?: string;
  message?: string;
}

interface AcceptAck {
  ok: boolean;
  /** Who's already in the call — join each of them by sending an offer;
   * they won't send one to you first (see insta_Back's socket/calls.js). */
  participants?: UserSummary[];
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
 * Owns WebRTC audio/video calls — 1:1 or group. With N people, media is a
 * full mesh: this client holds one RTCPeerConnection per *other* connected
 * participant, all sharing the same local stream. Call lifecycle
 * (start/answer/end) goes through the REST `/chats/:chatId/calls` +
 * `/calls/:callId/{answer,end}` endpoints, which persist one history row per
 * call regardless of how many people join it; the backend relays
 * "call:incoming" / "call:accepted" / "call:rejected" / "call:peer-left" /
 * "call:ended" over the "/chat" socket. The SDP/ICE exchange itself flows
 * over that same socket ("call:signal", routed to one target at a time) —
 * only the media flows peer-to-peer. Whoever *joins* a call always sends the
 * offer to everyone already in it (never the other way around), which is
 * what keeps two people from racing to offer each other at once. Mount once
 * inside `SocketProvider` and read with `useCall()`.
 */
export function CallProvider({ children }: { children: React.ReactNode }) {
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  const [status, setStatus] = useState<CallStatus>("idle");
  const [callType, setCallType] = useState<CallType | null>(null);
  const [peer, setPeer] = useState<UserSummary | null>(null);
  const [isGroup, setIsGroup] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteParticipants, setRemoteParticipants] = useState<
    RemoteParticipant[]
  >([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const sessionRef = useRef<Session | null>(null);
  const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const streamsRef = useRef<Map<string, MediaStream>>(new Map());
  const rosterRef = useRef<Map<string, UserSummary>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(
    new Map(),
  );
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

  const syncRemoteParticipants = useCallback(() => {
    setRemoteParticipants(
      Array.from(rosterRef.current.entries()).map(([id, user]) => ({
        user,
        stream: streamsRef.current.get(id) ?? null,
      })),
    );
  }, []);

  /** `call:initiate` is the only call event whose ack we need — it carries
   * the shared call id, and it is what actually rings everyone else. */
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

  /** Closes and forgets one peer's connection — the shared local tracks are
   * *not* touched, since they're also feeding every other open connection in
   * a group call. Only `cleanup()` (leaving the call entirely) stops them. */
  const removePeerConnection = useCallback(
    (userId: string) => {
      const pc = pcsRef.current.get(userId);
      if (pc) {
        pc.onicecandidate = null;
        pc.ontrack = null;
        pc.onconnectionstatechange = null;
        pc.close();
      }
      pcsRef.current.delete(userId);
      streamsRef.current.delete(userId);
      rosterRef.current.delete(userId);
      pendingCandidatesRef.current.delete(userId);
      syncRemoteParticipants();
    },
    [syncRemoteParticipants],
  );

  const cleanup = useCallback(() => {
    for (const userId of Array.from(pcsRef.current.keys())) {
      removePeerConnection(userId);
    }
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    sessionRef.current = null;
    setLocalStream(null);
    setStatus("idle");
    setCallType(null);
    setPeer(null);
    setIsGroup(false);
    setIsMuted(false);
    setIsCameraOff(false);
    setCallDuration(0);
  }, [removePeerConnection]);

  const getMedia = useCallback(async (type: CallType) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: type === "video",
    });
    localStreamRef.current = stream;
    setLocalStream(stream);
    return stream;
  }, []);

  /** Opens a connection to one remote participant and starts forwarding our
   * local tracks to them — used both when *we're* the one joining (offering
   * to everyone already in the call) and when we receive someone else's
   * offer (we just haven't built their connection yet). */
  const createPeerConnectionFor = useCallback(
    (remoteUser: UserSummary, conversationId: string, callId: string) => {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      localStreamRef.current
        ?.getTracks()
        .forEach((track) => pc.addTrack(track, localStreamRef.current as MediaStream));

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          emit("call:signal", {
            callId,
            conversationId,
            to: remoteUser.id,
            data: { kind: "ice", candidate: event.candidate.toJSON() },
          });
        }
      };

      pc.ontrack = (event) => {
        streamsRef.current.set(remoteUser.id, event.streams[0]);
        syncRemoteParticipants();
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
          if (!pcsRef.current.has(remoteUser.id)) return; // already torn down
          const wasFailed = pc.connectionState === "failed";
          removePeerConnection(remoteUser.id);
          if (wasFailed) {
            toast.error(`Connection to ${remoteUser.username} failed.`);
          }
          // Nobody left to talk to, and we're not just idly waiting on the
          // very first person to pick up — the call is effectively over.
          if (
            pcsRef.current.size === 0 &&
            statusRef.current !== "calling" &&
            statusRef.current !== "ringing"
          ) {
            endCallRef.current?.();
          }
        }
      };

      pcsRef.current.set(remoteUser.id, pc);
      rosterRef.current.set(remoteUser.id, remoteUser);
      syncRemoteParticipants();
      return pc;
    },
    [emit, removePeerConnection, syncRemoteParticipants],
  );

  const drainPendingCandidates = useCallback(async (userId: string) => {
    const pc = pcsRef.current.get(userId);
    if (!pc) return;
    const queued = pendingCandidatesRef.current.get(userId) ?? [];
    pendingCandidatesRef.current.delete(userId);
    for (const candidate of queued) {
      try {
        await pc.addIceCandidate(candidate);
      } catch {
        /* ignore late/duplicate candidates */
      }
    }
  }, []);

  const startCall = useCallback(
    async (conversationId: string, type: CallType, peers: UserSummary[]) => {
      if (!socket) {
        toast.error("You're offline — can't start a call.");
        return;
      }
      if (sessionRef.current || peers.length === 0) return;

      setCallType(type);
      setPeer(peers[0]);
      setIsGroup(peers.length > 1);
      setStatus("calling");

      try {
        await getMedia(type);
      } catch (error) {
        toast.error(describeMediaError(error, type));
        cleanup();
        return;
      }

      let signalId: string;
      try {
        // This is the part that actually rings everyone else: the server
        // relays `call:incoming` to the conversation's other participants.
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
        isGroup: peers.length > 1,
      };
      // The caller doesn't open any connections proactively — whoever joins
      // sends *us* the offer (see the class doc comment on directionality).

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
          session.answered = true;
          callsApi.answer(record.callId, "accept").catch(() => {});
        }
      } catch {
        /* no history row for this call */
      }
    },
    [socket, getMedia, initiateOverSocket, cleanup],
  );

  const acceptCall = useCallback(async () => {
    const session = sessionRef.current;
    if (!session || session.role !== "callee") return;
    setStatus("connecting");

    try {
      await getMedia(session.callType);
    } catch (error) {
      toast.error(describeMediaError(error, session.callType));
      emit("call:reject", {
        callId: session.signalId,
        conversationId: session.conversationId,
      });
      cleanup();
      return;
    }

    socket?.emit(
      "call:accept",
      { callId: session.signalId, conversationId: session.conversationId },
      async (ack: AcceptAck) => {
        if (!ack?.ok) {
          toast.error("Couldn't join the call.");
          cleanup();
          return;
        }
        // We're the one joining — offer to everyone already in the call
        // (there'll be at least the original caller).
        for (const participant of ack.participants ?? []) {
          const pc = createPeerConnectionFor(
            participant,
            session.conversationId,
            session.signalId,
          );
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            emit("call:signal", {
              callId: session.signalId,
              conversationId: session.conversationId,
              to: participant.id,
              data: { kind: "offer", sdp: offer },
            });
          } catch {
            removePeerConnection(participant.id);
          }
        }
      },
    );
  }, [socket, emit, getMedia, createPeerConnectionFor, removePeerConnection, cleanup]);

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

  // `createPeerConnectionFor`'s onconnectionstatechange closure is created
  // before `endCall` exists on the first render — a ref sidesteps the
  // ordering problem without pulling `endCall` into that callback's deps
  // (which would tear down and rebuild every open connection's handlers
  // whenever `endCall` itself changed identity).
  const endCallRef = useRef<() => void>(() => {});
  useEffect(() => {
    endCallRef.current = endCall;
  }, [endCall]);

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
      isGroup: boolean;
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
        isGroup: data.isGroup,
      };
      setCallType(data.callType);
      setPeer(data.from);
      setIsGroup(data.isGroup);
      setStatus("ringing");
    };

    // Informational: someone (the caller, or another member) joined the
    // call. The peer connection to them arrives separately via their offer
    // (`call:signal`) — this is only for the REST "answered" bookkeeping and
    // a toast, not for opening any connection ourselves.
    const onAccepted = (data: { from: UserSummary }) => {
      const session = sessionRef.current;
      if (!session) return;
      if (session.isGroup || rosterRef.current.size > 0) {
        toast(`${data.from.username} joined the call`);
      }
      if (session.role !== "caller") return;
      if (session.recordId) {
        if (!session.answered) {
          session.answered = true;
          callsApi.answer(session.recordId, "accept").catch(() => {});
        }
      } else {
        session.acceptedBeforeRecord = true;
      }
    };

    const onSignal = async (data: { from: UserSummary; data: SignalData }) => {
      const session = sessionRef.current;
      if (!session) return;
      const fromId = data.from.id;
      let pc = pcsRef.current.get(fromId);
      const payload = data.data;

      try {
        if (payload.kind === "offer" && payload.sdp) {
          if (!pc) {
            pc = createPeerConnectionFor(
              data.from,
              session.conversationId,
              session.signalId,
            );
          }
          await pc.setRemoteDescription(payload.sdp);
          await drainPendingCandidates(fromId);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          emit("call:signal", {
            callId: session.signalId,
            conversationId: session.conversationId,
            to: fromId,
            data: { kind: "answer", sdp: answer },
          });
        } else if (payload.kind === "answer" && payload.sdp && pc) {
          await pc.setRemoteDescription(payload.sdp);
          await drainPendingCandidates(fromId);
        } else if (payload.kind === "ice" && payload.candidate) {
          if (pc?.remoteDescription) {
            await pc.addIceCandidate(payload.candidate);
          } else {
            const queue = pendingCandidatesRef.current.get(fromId) ?? [];
            queue.push(payload.candidate);
            pendingCandidatesRef.current.set(fromId, queue);
          }
        }
      } catch {
        /* ignore malformed/late signaling */
      }
    };

    const onRejected = (data: { from: UserSummary }) => {
      const session = sessionRef.current;
      if (!session) return;
      toast(session.isGroup ? `${data.from.username} declined` : "Call declined.");
      // A group call carries on for whoever's still ringing or already
      // connected — only a 1:1 decline actually ends anything.
      if (session.isGroup) return;
      if (session.recordId) {
        callsApi.answer(session.recordId, "reject").catch(() => {});
      }
      if (session.role === "caller") {
        logCallOutcome(session.conversationId, session.callType, "declined");
      }
      cleanup();
    };

    // One participant left — drop just their connection; the call goes on
    // for whoever's left. `createPeerConnectionFor`'s own state-change
    // handler ends it entirely once nobody's left to talk to.
    const onPeerLeft = (data: { from: UserSummary }) => {
      if (!pcsRef.current.has(data.from.id)) return;
      removePeerConnection(data.from.id);
      toast(`${data.from.username} left the call`);
      if (
        pcsRef.current.size === 0 &&
        statusRef.current !== "calling" &&
        statusRef.current !== "ringing"
      ) {
        endCallRef.current?.();
      }
    };

    // The call itself is over — everyone who'd joined has left (or, for a
    // 1:1, the other side hung up).
    const onEnded = () => {
      const session = sessionRef.current;
      if (session?.recordId) callsApi.end(session.recordId).catch(() => {});
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
    socket.on("call:peer-left", onPeerLeft);
    socket.on("call:ended", onEnded);

    return () => {
      socket.off("call:incoming", onIncoming);
      socket.off("call:accepted", onAccepted);
      socket.off("call:signal", onSignal);
      socket.off("call:rejected", onRejected);
      socket.off("call:peer-left", onPeerLeft);
      socket.off("call:ended", onEnded);
    };
  }, [
    socket,
    emit,
    createPeerConnectionFor,
    removePeerConnection,
    drainPendingCandidates,
    cleanup,
    logCallOutcome,
  ]);

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
        isGroup,
        localStream,
        remoteParticipants,
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
