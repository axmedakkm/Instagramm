// Falls back to the deployed Render backend rather than localhost: the
// production build on Vercel doesn't have NEXT_PUBLIC_API_BASE_URL /
// NEXT_PUBLIC_SOCKET_URL configured, and since NEXT_PUBLIC_* vars are baked
// in at build time (not read at runtime), a localhost fallback there means
// every request tries to reach 127.0.0.1 from the visitor's browser — which
// the browser blocks outright (Private Network Access), not just CORS. Local
// dev still overrides both via .env.local.
const DEFAULT_API_BASE_URL = "https://instagram-back-jsr6.onrender.com/api/v1";
const DEFAULT_SOCKET_URL = "https://instagram-back-jsr6.onrender.com";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL;

export const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ?? DEFAULT_SOCKET_URL;

export const ACCESS_TOKEN_COOKIE = "ig_access_token";
export const REFRESH_TOKEN_COOKIE = "ig_refresh_token";

/**
 * ICE servers for WebRTC calls (see `CallProvider`). STUN alone only lets
 * two peers discover their public IP — it can't relay media, so calls
 * between peers that can't reach each other directly (mobile data, CGNAT,
 * most corporate networks) need a TURN relay or they'll never connect.
 *
 * Set `NEXT_PUBLIC_TURN_URL` / `NEXT_PUBLIC_TURN_USERNAME` /
 * `NEXT_PUBLIC_TURN_CREDENTIAL` (e.g. from a free metered.ca account —
 * https://www.metered.ca/tools/openrelay/ — or a self-hosted coturn) to use
 * your own TURN server. Falls back to metered.ca's public "Open Relay" demo
 * servers so calls work out of the box, but those are shared/rate-limited —
 * fine for development, not for real traffic.
 */
export const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  process.env.NEXT_PUBLIC_TURN_URL
    ? {
        urls: process.env.NEXT_PUBLIC_TURN_URL,
        username: process.env.NEXT_PUBLIC_TURN_USERNAME,
        credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL,
      }
    : {
        urls: [
          "turn:openrelay.metered.ca:80",
          "turn:openrelay.metered.ca:443",
          "turn:openrelay.metered.ca:443?transport=tcp",
        ],
        username: "openrelayproject",
        credential: "openrelayproject",
      },
];
