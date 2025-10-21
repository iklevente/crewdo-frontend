import type { PresenceSource, PresenceStatus, PresenceStateEntry } from 'store/presence-store';

import { axiosInstance } from './api-clients';

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
        const { data } = await axiosInstance.get<PresenceResponse[]>('/presence');
        return data;
    },

    async fetchCurrent(): Promise<PresenceResponse> {
        const { data } = await axiosInstance.get<PresenceResponse>('/presence/me');
        return data;
    },

    async setManual(payload: ManualPresencePayload): Promise<PresenceResponse> {
        const { data } = await axiosInstance.patch<PresenceResponse>(
            '/presence/me/manual',
            payload
        );
        return data;
    },

    async clearManual(): Promise<PresenceResponse> {
        const { data } = await axiosInstance.delete<PresenceResponse>('/presence/me/manual');
        return data;
    },

    toStateEntry: mapResponseToEntry
};
