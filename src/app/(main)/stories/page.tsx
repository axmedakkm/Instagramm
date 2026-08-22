"use client";

import { useSearchParams } from "next/navigation";
import { StoryViewer } from "@/components/stories/StoryViewer";
import { useAuthStore } from "@/store/useAuthStore";

export default function StoriesPage() {
  const searchParams = useSearchParams();
  const currentUser = useAuthStore((state) => state.user);
  const username = searchParams.get("u") ?? currentUser?.username ?? "";

  return <StoryViewer initialUsername={username} />;
}
