import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AuthUser } from "@shared/schema";

type AuthPayload = {
  email: string;
  password: string;
  name?: string;
  city?: string;
};

async function readApiResponse<T>(response: Response) {
  const text = await response.text();
  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");

  if (isJson) {
    const data = JSON.parse(text) as T;
    if (!response.ok) {
      const message =
        typeof data === "object" && data && "message" in data
          ? String((data as { message?: string }).message ?? "Request failed")
          : "Request failed";
      throw new Error(message);
    }
    return data;
  }

  if (!response.ok) {
    throw new Error(text || "Request failed");
  }

  throw new Error("The server returned an unexpected response format.");
}

export function useAuth() {
  return useQuery({
    queryKey: ["auth-user"],
    queryFn: async () => {
      const response = await fetch("/api/auth/me", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Unable to check auth state");
      }

      return readApiResponse<{ user: AuthUser | null }>(response);
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: AuthPayload) => {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      return readApiResponse<{ user: AuthUser }>(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth-user"] });
    },
  });
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: AuthPayload) => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      return readApiResponse<{ user: AuthUser }>(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth-user"] });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok && response.status !== 204) {
        throw new Error("Logout failed");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth-user"] });
    },
  });
}
