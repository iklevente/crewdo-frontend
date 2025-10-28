import type { PresenceSource, PresenceStatus, PresenceStateEntry } from 'store/presence-store';

import { apiClients } from './api-clients';

interface PresenceResponse {
    readonly userId: string;
    readonly status: PresenceStatus;
    readonly customStatus?: string | null;
    readonly statusSource: PresenceSource;
    readonly manualStatus?: PresenceStatus | null;
    readonly manualCustomStatus?: string | null;
    readonly lastSeenAt?: string | null;
    readonly timestamp: string;
}

interface ManualPresencePayload {
    readonly status: PresenceStatus;
    readonly customStatus?: string;
}

const mapResponseToEntry = (response: PresenceResponse): PresenceStateEntry => ({
    status: response.status,
    customStatus: response.customStatus ?? null,
    statusSource: response.statusSource,
    manualStatus: response.manualStatus ?? null,
    manualCustomStatus: response.manualCustomStatus ?? null,
    lastSeenAt: response.lastSeenAt ?? null,
    timestamp: response.timestamp
});

export const presenceApi = {
    async fetchAll(): Promise<PresenceResponse[]> {
        const response = (await apiClients.presence.presenceControllerFindAll()) as unknown as {
            data: PresenceResponse[];
        };
        return response.data;
    },

    async fetchCurrent(): Promise<PresenceResponse> {
        const response = (await apiClients.presence.presenceControllerFindMine()) as unknown as {
            data: PresenceResponse;
        };
        return response.data;
    },

    async setManual(payload: ManualPresencePayload): Promise<PresenceResponse> {
        const response = (await apiClients.presence.presenceControllerSetManualPresence(
            payload
        )) as unknown as { data: PresenceResponse };
        return response.data;
    },

    async clearManual(): Promise<PresenceResponse> {
        const response =
            (await apiClients.presence.presenceControllerClearManualPresence()) as unknown as {
                data: PresenceResponse;
            };
        return response.data;
    },

    toStateEntry: mapResponseToEntry
};
