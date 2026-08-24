export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000/api/v1";

export const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:5000";

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
