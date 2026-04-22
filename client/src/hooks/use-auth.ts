import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AuthUser } from "@shared/schema";

type AuthPayload = {
  email: string;
  password: string;
  name?: string;
  city?: string;
};

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

      return (await response.json()) as { user: AuthUser | null };
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

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message ?? "Registration failed");
      }

      return data as { user: AuthUser };
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

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message ?? "Login failed");
      }

      return data as { user: AuthUser };
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
