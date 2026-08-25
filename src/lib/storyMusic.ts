import type { StoryMusic } from "@/store/useStoryArchiveStore";

/**
 * The built-in music library for stories. A real app would fetch a licensed
 * catalogue from the backend; since this backend has none, we ship a small
 * fixed list. The audio clips are public sample tracks, so the names are
 * generic (not real licensed songs) to keep things honest.
 */
export const STORY_MUSIC: StoryMusic[] = [
  {
    id: "song-1",
    title: "Golden Hour",
    artist: "Aeon",
    previewUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
  },
  {
    id: "song-2",
    title: "Midnight Drive",
    artist: "Nova",
    previewUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
  },
  {
    id: "song-3",
    title: "Paper Planes",
    artist: "Lumen",
    previewUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
  },
  {
    id: "song-4",
    title: "Slow Motion",
    artist: "Kira",
    previewUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
  },
  {
    id: "song-5",
    title: "Neon Skies",
    artist: "Halcyon",
    previewUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3",
  },
];
