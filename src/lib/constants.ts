export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000/api/v1";

export const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:5000";

export const ACCESS_TOKEN_COOKIE = "ig_access_token";
export const REFRESH_TOKEN_COOKIE = "ig_refresh_token";
