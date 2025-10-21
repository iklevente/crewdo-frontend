import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AuthSession, AuthUser } from '../features/auth/types';

interface AuthState {
    accessToken: string | null;
    refreshToken: string | null;
    user: AuthUser | null;
    isHydrated: boolean;
    setSession: (session: AuthSession) => void;
    setTokens: (accessToken: string, refreshToken?: string | null) => void;
    setUser: (user: AuthUser | null) => void;
    clearAuth: () => void;
    markHydrated: () => void;
}

const storage =
    typeof window !== 'undefined' ? createJSONStorage(() => window.localStorage) : undefined;

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            accessToken: null,
            refreshToken: null,
            user: null,
            isHydrated: false,
            setSession: (session: AuthSession) => {
                set({
                    accessToken: session.accessToken,
                    refreshToken: session.refreshToken,
                    user: session.user
                });
            },
            setTokens: (accessToken: string, refreshToken?: string | null) => {
                set(state => ({
                    accessToken,
                    refreshToken: refreshToken ?? state.refreshToken
                }));
            },
            setUser: (user: AuthUser | null) => {
                set({ user });
            },
            clearAuth: () => {
                set({ accessToken: null, refreshToken: null, user: null });
            },
            markHydrated: () => {
                if (!get().isHydrated) {
                    set({ isHydrated: true });
                }
            }
        }),
        {
            name: 'crewdo-auth-store',
            storage,
            partialize: state => ({
                accessToken: state.accessToken,
                refreshToken: state.refreshToken,
                user: state.user
            }),
            onRehydrateStorage: () => state => {
                state?.markHydrated();
            }
        }
    )
);
