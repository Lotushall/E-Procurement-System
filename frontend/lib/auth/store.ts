import { create } from "zustand";
import { fetchCurrentUser } from "@/lib/auth/api";
import type { User } from "@/lib/auth/types";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  fetchUser: () => Promise<void>;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  fetchUser: async () => {
    set({ isLoading: true });
    const user = await fetchCurrentUser();
    set({ user, isLoading: false, isAuthenticated: !!user });
  },
  setUser: (user) => set({ user, isAuthenticated: !!user }),
}));
