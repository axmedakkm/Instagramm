"use client";

import { Mic, MicOff, Phone, PhoneOff, Video, VideoOff } from "lucide-react";
import { useEffect, useRef } from "react";
import type { RemoteParticipant } from "@/components/providers/CallProvider";
import { useCall } from "@/components/providers/CallProvider";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { cn } from "@/lib/utils";

/** `grid-cols`/`grid-rows` that keep tiles roughly square for a given
 * headcount — 1 fills the screen, 2 stacks, 3-4 is a 2x2, beyond that just
 * keeps adding columns (this mesh isn't meant to scale past a handful). */
function gridClassFor(count: number) {
  if (count <= 1) return "grid-cols-1";
  if (count === 2) return "grid-cols-1 grid-rows-2 sm:grid-cols-2 sm:grid-rows-1";
  if (count <= 4) return "grid-cols-2 grid-rows-2";
  return "grid-cols-2 grid-rows-3";
}

export function CallOverlay() {
  const {
    status,
    callType,
    peer,
    isGroup,
    localStream,
    remoteParticipants,
    isMuted,
    isCameraOff,
    callDuration,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleCamera,
  } = useCall();

  const localVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
  }, [localStream, status]);

  if (status === "idle" || !peer) return null;

  const isVideo = callType === "video";
  const isConnected = status === "in-call";
  const durationLabel = `${String(Math.floor(callDuration / 60)).padStart(2, "0")}:${String(
    callDuration % 60,
  ).padStart(2, "0")}`;
  // Duration is shown separately in the top badge once connected, so this
  // label only covers the pre-connection states.
  const statusLabel =
    status === "ringing"
      ? `Incoming ${isVideo ? "video" : "voice"}${isGroup ? " group" : ""} call`
      : status === "calling"
        ? "Calling…"
        : status === "connecting"
          ? "Connecting…"
          : "";
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-between bg-neutral-950 text-white">
      {/* Connected: one tile per participant, video if they have it. */}
      {isConnected && (
        <div
          className={cn(
            "absolute inset-0 grid gap-0.5",
            gridClassFor(remoteParticipants.length),
          )}
        >
          {remoteParticipants.map((participant) => (
            <RemoteTile
              key={participant.user.id}
              participant={participant}
              showVideo={isVideo}
            />
          ))}
        </div>
      )}

      {/* Duration badge — pinned to the top so it stays visible even once
       * the peer identity block fades out behind a connected video call. */}
      {isConnected && (
        <p className="glass-media z-10 mt-4 rounded-full px-3.5 py-1 text-sm tabular-nums text-white/90 ring-1 ring-white/15">
          {durationLabel}
          {remoteParticipants.length > 1 && ` · ${remoteParticipants.length + 1} people`}
        </p>
      )}

      {/* Local self-view (picture-in-picture) for video calls. */}
      {isVideo && (localStream || isConnected) && (
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className={cn(
            "absolute right-4 top-4 z-10 w-28 rounded-2xl border border-white/20 object-cover shadow-float transition-all duration-300 ease-smooth sm:w-40",
            isCameraOff && "hidden",
          )}
        />
      )}

      {/* Caller/peer identity — the pre-connect screen only. Once connected,
       * each participant's own tile (video or avatar) in the grid above
       * covers this exact information per person instead. */}
      {!isConnected && (
        <div className="z-10 flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <UserAvatar
            user={peer}
            size="xl"
            className="size-28 animate-pulse shadow-float ring-2 ring-white/30"
          />
          <div>
            <p className="text-2xl font-semibold">{peer.username}</p>
            {statusLabel && (
              <p className="mt-1 text-sm text-white/70">{statusLabel}</p>
            )}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="glass-media z-10 mb-12 flex items-center gap-4 rounded-full px-5 py-3 ring-1 ring-white/15">
        {status === "ringing" ? (
          <>
            <button
              type="button"
              onClick={rejectCall}
              aria-label="Decline"
              className="flex size-16 items-center justify-center rounded-full bg-red-500 transition-transform hover:scale-105"
            >
              <PhoneOff className="size-7" />
            </button>
            <button
              type="button"
              onClick={acceptCall}
              aria-label="Accept"
              className="flex size-16 items-center justify-center rounded-full bg-green-500 transition-transform hover:scale-105"
            >
              <Phone className="size-7" />
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={toggleMute}
              aria-label={isMuted ? "Unmute" : "Mute"}
              className={cn(
                "flex size-14 items-center justify-center rounded-full transition-colors",
                isMuted ? "bg-white text-neutral-900" : "bg-white/15 hover:bg-white/25",
              )}
            >
              {isMuted ? <MicOff className="size-6" /> : <Mic className="size-6" />}
            </button>

            {isVideo && (
              <button
                type="button"
                onClick={toggleCamera}
                aria-label={isCameraOff ? "Turn camera on" : "Turn camera off"}
                className={cn(
                  "flex size-14 items-center justify-center rounded-full transition-colors",
                  isCameraOff
                    ? "bg-white text-neutral-900"
                    : "bg-white/15 hover:bg-white/25",
                )}
              >
                {isCameraOff ? (
                  <VideoOff className="size-6" />
                ) : (
                  <Video className="size-6" />
                )}
              </button>
            )}

            <button
              type="button"
              onClick={endCall}
              aria-label="End call"
              className="flex size-16 items-center justify-center rounded-full bg-red-500 transition-transform hover:scale-105"
            >
              <PhoneOff className="size-7" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/** One connected participant's tile — their video if the call has any and
 * they're sending one, an avatar card otherwise (voice call, or their camera
 * is off). Audio always plays regardless, via the hidden sink below. */
function RemoteTile({
  participant,
  showVideo,
}: {
  participant: RemoteParticipant;
  showVideo: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const hasVideoTrack = !!participant.stream?.getVideoTracks().some((t) => t.enabled);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = participant.stream;
    if (audioRef.current) audioRef.current.srcObject = participant.stream;
  }, [participant.stream]);

  return (
    <div className="relative flex items-center justify-center overflow-hidden bg-neutral-900">
      {showVideo && hasVideoTrack ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="size-full object-cover"
        />
      ) : (
        <UserAvatar user={participant.user} size="xl" className="size-20" />
      )}
      <audio ref={audioRef} autoPlay className="hidden" />
      <span className="absolute bottom-2 left-2 rounded-full bg-black/50 px-2 py-0.5 text-xs font-medium backdrop-blur">
        {participant.user.username}
      </span>
    </div>
  );
}
