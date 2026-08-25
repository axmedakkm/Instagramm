"use client";

import { Pause, Play } from "lucide-react";
import { useRef, useState } from "react";

/** How many bars the waveform is drawn with. */
const BAR_COUNT = 30;

/**
 * A voice message player.
 *
 * Replaces the browser's default `<audio controls>`, which looks completely
 * different in every browser and can't be styled. Everything here is drawn
 * with `currentColor`, so the same component reads correctly inside both
 * chat bubbles — the blue gradient one and the muted grey one — without a
 * single conditional colour.
 */
export function VoiceMessage({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const bars = buildBars(src);
  const progress = duration > 0 ? currentTime / duration : 0;

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  };

  /**
   * Chrome reports `duration: Infinity` for the webm blobs MediaRecorder
   * produces, because they're written without a length header. Seeking to a
   * huge offset forces it to scan to the end and report the real duration,
   * after which we rewind. Without this the timer would read 0:00 forever.
   */
  const handleLoadedMetadata = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (Number.isFinite(audio.duration)) {
      setDuration(audio.duration);
      return;
    }
    audio.currentTime = 1e101;
  };

  const handleDurationChange = () => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(audio.duration)) return;
    setDuration(audio.duration);
    audio.currentTime = 0;
  };

  /** Click anywhere on the waveform to jump there. */
  const seek = (event: React.MouseEvent<HTMLButtonElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const { left, width } = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - left) / width;
    audio.currentTime = Math.min(Math.max(ratio, 0), 1) * duration;
  };

  return (
    <div className="flex w-56 max-w-full items-center gap-2.5 py-0.5">
      <button
        type="button"
        onClick={togglePlay}
        aria-label={isPlaying ? "Pause voice message" : "Play voice message"}
        className="grid size-9 shrink-0 place-items-center rounded-full bg-current/15 transition-transform duration-200 ease-spring hover:scale-110 active:scale-90"
      >
        {isPlaying ? (
          <Pause className="size-4 fill-current" />
        ) : (
          <Play className="size-4 translate-x-px fill-current" />
        )}
      </button>

      <button
        type="button"
        onClick={seek}
        aria-label="Seek"
        className="flex h-8 flex-1 items-center gap-[2px]"
      >
        {bars.map((height, index) => (
          <span
            key={index}
            // Bars left of the playhead are solid; the rest are faded.
            className={
              index / BAR_COUNT <= progress
                ? "flex-1 rounded-full bg-current"
                : "flex-1 rounded-full bg-current opacity-40"
            }
            style={{ height: `${Math.round(height * 100)}%` }}
          />
        ))}
      </button>

      <span className="shrink-0 text-[11px] tabular-nums opacity-80">
        {formatTime(isPlaying || currentTime > 0 ? currentTime : duration)}
      </span>

      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={handleLoadedMetadata}
        onDurationChange={handleDurationChange}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
      />
    </div>
  );
}

/** Seconds → "0:07". */
function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "0:00";
  const whole = Math.floor(seconds);
  const minutes = Math.floor(whole / 60);
  return `${minutes}:${String(whole % 60).padStart(2, "0")}`;
}

/**
 * Bar heights for the waveform.
 *
 * These are decorative, not the real audio amplitudes — reading those would
 * mean downloading and decoding every clip through the Web Audio API, for
 * every message in the thread. Instead the shape is derived from the message
 * URL, so a given voice message always draws the same waveform and it never
 * flickers between renders.
 */
function buildBars(seed: string) {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) | 0;
  }

  const bars: number[] = [];
  for (let index = 0; index < BAR_COUNT; index += 1) {
    // A tiny linear congruential generator: same seed, same sequence.
    hash = (hash * 1103515245 + 12345) | 0;
    // Keep every bar at least 25% tall so none of them vanish.
    bars.push(0.25 + ((Math.abs(hash) % 1000) / 1000) * 0.75);
  }
  return bars;
}
