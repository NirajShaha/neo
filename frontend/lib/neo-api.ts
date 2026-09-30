"use client";

import { useCallback } from "react";
import { useSession } from "next-auth/react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export function useApi() {
  const { data } = useSession();
  const token = (data as { backendToken?: string } | null)?.backendToken;

  const request = useCallback(
    async <T>(path: string, init: RequestInit = {}): Promise<T> => {
      const headers = new Headers(init.headers);
      if (!(init.body instanceof FormData)) {
        headers.set("Content-Type", "application/json");
      }
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      const response = await fetch(`${API_URL}${path}`, { ...init, headers });
      if (!response.ok) {
        let detail = response.statusText;
        try {
          const body = await response.json();
          detail = body.detail ?? body.title ?? detail;
        } catch {
          /* keep status text */
        }
        throw new Error(`Backend ${response.status}: ${detail}`);
      }
      if (response.status === 204) {
        return undefined as T;
      }
      return (await response.json()) as T;
    },
    [token]
  );

  return { request, token };
}
