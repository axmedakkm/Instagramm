"use client";

import { Mic, MicOff, Phone, PhoneOff, Video, VideoOff } from "lucide-react";
import { useEffect, useRef } from "react";
import { useCall } from "@/components/providers/CallProvider";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { cn } from "@/lib/utils";

export function CallOverlay() {
  const {
    status,
    callType,
    peer,
    localStream,
    remoteStream,
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
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
  }, [localStream, status]);

  useEffect(() => {
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = remoteStream;
  }, [remoteStream, status]);

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
      ? `Incoming ${isVideo ? "video" : "voice"} call`
      : status === "calling"
        ? "Calling…"
        : status === "connecting"
          ? "Connecting…"
          : "";

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-between bg-neutral-950 text-white">
      {/* Remote video fills the screen for a connected video call. */}
      {isVideo && isConnected && (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="absolute inset-0 size-full object-cover"
        />
      )}
      {/* Audio sink — needed for voice calls and as a fallback for video. */}
      <audio ref={remoteAudioRef} autoPlay className="hidden" />

      {/* Duration badge — pinned to the top so it stays visible even once
       * the peer identity block fades out behind a connected video call. */}
      {isConnected && (
        <p className="glass-media z-10 mt-4 rounded-full px-3.5 py-1 text-sm tabular-nums text-white/90 ring-1 ring-white/15">
          {durationLabel}
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

      {/* Caller/peer identity — shown until a video stream covers it. */}
      <div
        className={cn(
          "z-10 flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center transition-opacity duration-500 ease-smooth",
          isVideo && isConnected && "pointer-events-none opacity-0",
        )}
      >
        <UserAvatar
          user={peer}
          size="xl"
          className={cn(
            "size-28 shadow-float ring-2 ring-white/30",
            !isConnected && "animate-pulse",
          )}
        />
        <div>
          <p className="text-2xl font-semibold">{peer.username}</p>
          {statusLabel && (
            <p className="mt-1 text-sm text-white/70">{statusLabel}</p>
          )}
        </div>
      </div>

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
