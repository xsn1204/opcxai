import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, TalentProfile, CorpProfile } from "@/types";

interface AuthState {
  user: User | null;
  talentProfile: TalentProfile | null;
  corpProfile: CorpProfile | null;
  setUser: (user: User | null) => void;
  setTalentProfile: (profile: TalentProfile | null) => void;
  setCorpProfile: (profile: CorpProfile | null) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      talentProfile: null,
      corpProfile: null,
      setUser: (user) => set({ user }),
      setTalentProfile: (talentProfile) => set({ talentProfile }),
      setCorpProfile: (corpProfile) => set({ corpProfile }),
      clearAuth: () =>
        set({ user: null, talentProfile: null, corpProfile: null }),
    }),
    {
      name: "opc-auth",
      partialize: (state) => ({
        user: state.user,
        talentProfile: state.talentProfile,
        corpProfile: state.corpProfile,
      }),
    }
  )
);

// UI state
interface UIState {
  sidebarCollapsed: boolean;
  notifications: number;
  setSidebarCollapsed: (v: boolean) => void;
  setNotifications: (count: number) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  notifications: 0,
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
  setNotifications: (notifications) => set({ notifications }),
}));
