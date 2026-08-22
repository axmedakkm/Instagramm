import axios, {
  AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";
import { API_BASE_URL } from "@/lib/constants";
import { authStorage } from "@/store/useAuthStore";
import type { AuthTokens } from "@/types";

/**
 * Shared Axios instance used by every API call in the app.
 * - Attaches the bearer token on every request.
 * - Transparently refreshes an expired access token on a single 401 retry.
 * - Queues concurrent requests while a refresh is in-flight so we only ever
 *   hit `/auth/refresh` once.
 */
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = authStorage.getAccessToken();
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});

interface RetriableConfig extends AxiosRequestConfig {
  _retry?: boolean;
}

let isRefreshing = false;
let pendingQueue: {
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}[] = [];

function resolveQueue(token: string) {
  pendingQueue.forEach(({ resolve }) => resolve(token));
  pendingQueue = [];
}

function rejectQueue(error: unknown) {
  pendingQueue.forEach(({ reject }) => reject(error));
  pendingQueue = [];
}

function redirectToLogin() {
  authStorage.logout();
  if (typeof window !== "undefined" && window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetriableConfig | undefined;

    if (!originalRequest || error.response?.status !== 401) {
      return Promise.reject(error);
    }

    // Never try to refresh the refresh call itself, and never retry twice.
    if (originalRequest._retry || originalRequest.url?.includes("/auth/refresh")) {
      redirectToLogin();
      return Promise.reject(error);
    }

    const refreshToken = authStorage.getRefreshToken();
    if (!refreshToken) {
      redirectToLogin();
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (isRefreshing) {
      // Another request already triggered a refresh; wait for it to finish
      // and retry this request with the new token once it resolves.
      return new Promise((resolve, reject) => {
        pendingQueue.push({
          resolve: (token: string) => {
            originalRequest.headers = {
              ...originalRequest.headers,
              Authorization: `Bearer ${token}`,
            };
            resolve(api(originalRequest));
          },
          reject,
        });
      });
    }

    isRefreshing = true;

    try {
      const { data } = await axios.post<AuthTokens>(
        `${API_BASE_URL}/auth/refresh`,
        { refreshToken },
      );

      authStorage.setTokens(data.accessToken, data.refreshToken);
      resolveQueue(data.accessToken);

      originalRequest.headers = {
        ...originalRequest.headers,
        Authorization: `Bearer ${data.accessToken}`,
      };
      return api(originalRequest);
    } catch (refreshError) {
      rejectQueue(refreshError);
      redirectToLogin();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

/** Convenience helper for multipart/form-data uploads (media, avatars, posts). */
export function toFormData(fields: Record<string, unknown>): FormData {
  const formData = new FormData();

  Object.entries(fields).forEach(([key, value]) => {
    if (value === undefined || value === null) return;

    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item instanceof File || item instanceof Blob) {
          formData.append(key, item);
        } else {
          formData.append(key, String(item));
        }
      });
      return;
    }

    if (value instanceof File || value instanceof Blob) {
      formData.append(key, value);
      return;
    }

    formData.append(key, String(value));
  });

  return formData;
}

export default api;
