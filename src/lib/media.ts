/**
 * `Message.mediaUrl` doesn't carry a media-type field from the backend, so
 * image and voice-note attachments have to be told apart client-side. Voice
 * notes always come from `useVoiceRecorder`, which only ever produces
 * `.webm`/`.m4a` (see its `stop()`); anything else is treated as an image,
 * which covers both real image uploads and any extensionless upload URL.
 */
export function getMessageMediaKind(url: string): "image" | "audio" {
  const path = url.split("?")[0]?.toLowerCase() ?? "";
  return /\.(webm|m4a|mp3|ogg|wav|aac)$/.test(path) ? "audio" : "image";
}

/**
 * A story-mention message's `mediaUrl` is a straight copy of the story's own
 * media, which — unlike every other message attachment — can be a video.
 * `getMessageMediaKind` doesn't account for that (its "image" bucket is only
 * ever really an image for every other message kind), so mention bubbles
 * check this first before falling back to `<img>`/`<Image>`.
 */
export function isVideoUrl(url: string): boolean {
  const path = url.split("?")[0]?.toLowerCase() ?? "";
  return /\.(mp4|mov|webm|m4v|avi)$/.test(path);
}
