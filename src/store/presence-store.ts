import { create } from 'zustand';

export type PresenceStatus = 'online' | 'offline' | 'away' | 'busy';
export type PresenceSource = 'auto' | 'manual';

export interface PresenceStateEntry {
    readonly status: PresenceStatus;
    readonly customStatus?: string | null;
    readonly statusSource: PresenceSource;
    readonly manualStatus?: PresenceStatus | null;
    readonly manualCustomStatus?: string | null;
    readonly lastSeenAt?: string | null;
    readonly timestamp?: string;
}

interface PresenceState {
    readonly entries: Record<string, PresenceStateEntry>;
    readonly setPresence: (userId: string, entry: PresenceStateEntry) => void;
    readonly setMany: (updates: { userId: string; entry: PresenceStateEntry }[]) => void;
    readonly clear: () => void;
    readonly ensureOnline: (userId: string) => void;
}

const mergeEntry = (
    current: PresenceStateEntry | undefined,
    incoming: PresenceStateEntry
): PresenceStateEntry => ({
    status: incoming.status,
    customStatus: incoming.customStatus ?? null,
    statusSource: incoming.statusSource ?? current?.statusSource ?? 'auto',
    manualStatus: incoming.manualStatus ?? null,
    manualCustomStatus: incoming.manualCustomStatus ?? null,
    lastSeenAt: incoming.lastSeenAt ?? current?.lastSeenAt ?? null,
    timestamp: incoming.timestamp ?? current?.timestamp
});

export const usePresenceStore = create<PresenceState>(set => ({
    entries: {},
    setPresence: (userId: string, entry: PresenceStateEntry) => {
        set(state => ({
            entries: {
                ...state.entries,
                [userId]: mergeEntry(state.entries[userId], entry)
            }
        }));
    },
    setMany: (updates: { userId: string; entry: PresenceStateEntry }[]) => {
        if (updates.length === 0) {
            return;
        }
        set(state => {
            const entries = { ...state.entries };
            for (const update of updates) {
                entries[update.userId] = mergeEntry(entries[update.userId], update.entry);
            }
            return { entries };
        });
    },
    clear: () => {
        set({ entries: {} });
    },
    ensureOnline: (userId: string) => {
        set(state => {
            const entries = { ...state.entries };
            const current = entries[userId];

            if (current?.statusSource === 'manual' && current.manualStatus) {
                // Respect manual overrides
                return { entries };
            }

            const timestamp = new Date().toISOString();
            entries[userId] = mergeEntry(current, {
                status: 'online',
                statusSource: 'auto',
                customStatus: current?.customStatus ?? null,
                manualStatus: null,
                manualCustomStatus: null,
                lastSeenAt: timestamp,
                timestamp
            });

            return { entries };
        });
    }
}));

export const usePresence = (userId: string | null | undefined): PresenceStateEntry | undefined => {
    return usePresenceStore(state => (userId ? state.entries[userId] : undefined));
};
