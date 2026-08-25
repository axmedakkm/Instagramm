import type { Conversation, ConversationParticipant, UserSummary } from "@/types";

/**
 * Every participant except the signed-in user. There's no backend concept
 * of "group" vs "1:1" — a conversation is just its participant list — so
 * this is what both shapes reduce to: one other person for a DM, several
 * for a group.
 */
export function otherParticipants(
  conversation: Pick<Conversation, "participants">,
  currentUserId?: string,
): ConversationParticipant[] {
  const others = conversation.participants.filter((p) => p.id !== currentUserId);
  // Degenerate case (e.g. viewing your own single-participant row before the
  // list has settled) — fall back to whoever's there rather than showing
  // nothing.
  return others.length > 0 ? others : conversation.participants;
}

export function isGroupConversation(
  conversation: Pick<Conversation, "participants">,
): boolean {
  return conversation.participants.length > 2;
}

/** My private nickname for this participant (see `Conversation.nicknames`),
 * falling back to their real username if I haven't set one. */
export function displayName(
  user: UserSummary,
  nicknames: Record<string, string> | undefined,
): string {
  return nicknames?.[user.id] || user.username;
}

/** "alice", or "alice, bob, carol" for a group — truncated with a "+N" tail
 * past `maxNames` so a big group doesn't blow out the header/row. Prefers a
 * set group name over the member list when one exists. */
export function conversationTitle(
  conversation: Pick<Conversation, "name" | "nicknames">,
  others: UserSummary[],
  maxNames = 3,
): string {
  if (conversation.name) return conversation.name;
  const names = others.map((u) => displayName(u, conversation.nicknames));
  if (names.length <= maxNames) return names.join(", ");
  return `${names.slice(0, maxNames).join(", ")} +${names.length - maxNames}`;
}
