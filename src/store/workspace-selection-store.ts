import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface WorkspaceSelectionState {
    readonly selectedWorkspaceId: string | null;
    readonly isHydrated: boolean;
    readonly setSelectedWorkspaceId: (workspaceId: string | null) => void;
    readonly clearSelection: () => void;
    readonly markHydrated: () => void;
}

const storage =
    typeof window !== 'undefined' ? createJSONStorage(() => window.localStorage) : undefined;

export const useWorkspaceSelectionStore = create<WorkspaceSelectionState>()(
    persist(
        (set, get) => ({
            selectedWorkspaceId: null,
            isHydrated: storage ? false : true,
            setSelectedWorkspaceId: (workspaceId: string | null) => {
                set({ selectedWorkspaceId: workspaceId });
            },
            clearSelection: () => {
                set({ selectedWorkspaceId: null });
            },
            markHydrated: () => {
                if (!get().isHydrated) {
                    set({ isHydrated: true });
                }
            }
        }),
        {
            name: 'crewdo-workspace-selection',
            storage,
            partialize: state => ({
                selectedWorkspaceId: state.selectedWorkspaceId
            }),
            onRehydrateStorage: () => state => {
                state?.markHydrated();
            }
        }
    )
);
