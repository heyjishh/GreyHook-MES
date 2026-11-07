import { create } from "zustand";
import type { UserSchema } from "@/types/api";

interface AuthState {
  user: UserSchema | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string, user: UserSchema) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,

  login: (token, user) => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("auth_token", token);
    }
    set({ user, token, isAuthenticated: true });
  },

  logout: () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("auth_token");
    }
    set({ user: null, token: null, isAuthenticated: false });
  },
}));
