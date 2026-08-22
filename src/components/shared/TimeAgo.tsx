"use client";

import { formatDistanceToNowStrict } from "date-fns";

/** Compact "time ago" label, e.g. "3h", "2d", "5w" — Instagram-style. */
function toShortRelativeTime(dateIso: string): string {
  const full = formatDistanceToNowStrict(new Date(dateIso));
  // date-fns gives us "3 hours", "2 days", "5 weeks" — compress to "3h", "2d", "5w".
  const [amount, unit] = full.split(" ");
  const unitInitial = unit?.charAt(0) ?? "";
  return `${amount}${unitInitial}`;
}

export function TimeAgo({
  date,
  className,
}: {
  date: string;
  className?: string;
}) {
  return (
    <time
      dateTime={date}
      title={new Date(date).toLocaleString()}
      className={className}
    >
      {toShortRelativeTime(date)}
    </time>
  );
}
