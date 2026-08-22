import { redirect } from "next/navigation";

/**
 * `src/proxy.ts` already redirects `/` to `/feed` or `/login` based on the
 * auth cookie before this ever renders. This fallback only fires if proxy
 * is bypassed (e.g. a prefetch that skips it), so it defaults to the
 * unauthenticated destination.
 */
export default function RootPage() {
  redirect("/login");
}
