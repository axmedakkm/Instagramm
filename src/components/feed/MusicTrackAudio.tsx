"use client";

import { useEffect, useRef } from "react";

/**
 * Plays a post's music-sticker clip on a loop while `active` (i.e. the card is
 * on screen), honouring the `muted` toggle. Renders nothing visible — just the
 * `<audio>` element.
 *
 * Starts muted so the browser allows autoplay; unmuting happens from a user
 * tap, which is a gesture browsers accept, so the sound kicks in then.
 */
export function MusicTrackAudio({
  src,
  active,
  muted,
}: {
  src: string;
  active: boolean;
  muted: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);

  // Play only while the card is visible; pause otherwise so scrolling past a
  // post doesn't leave its track running.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (active) audio.play().catch(() => {});
    else audio.pause();
  }, [active, src]);

  // React doesn't reliably set `muted` as a DOM property from JSX, so drive it
  // imperatively.
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.muted = muted;
  }, [muted]);

  return <audio ref={audioRef} src={src} loop muted playsInline />;
}
