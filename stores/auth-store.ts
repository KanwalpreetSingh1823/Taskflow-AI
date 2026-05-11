import { create } from "zustand";
import type { AuthUser } from "@/types";

type AuthState = {
  user: AuthUser | null;
  loaded: boolean;
  setUser: (user: AuthUser | null) => void;
  setLoaded: (loaded: boolean) => void;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loaded: false,
  setUser: (user) => set({ user }),
  setLoaded: (loaded) => set({ loaded }),
  refreshUser: async () => {
    const res = await fetch("/api/auth/me");
    if (!res.ok) {
      set({ user: null });
      return;
    }
    const data = (await res.json()) as { user: AuthUser };
    set({ user: data.user });
  },
  logout: async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    set({ user: null });
    window.location.href = "/login";
  },
}));
