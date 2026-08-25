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
