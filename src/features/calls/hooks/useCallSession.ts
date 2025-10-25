import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { axiosInstance } from 'services/api-clients';
import type { CallSessionCredentials } from '../types/call';

interface RawCallSession {
    readonly token?: unknown;
    readonly url?: unknown;
    readonly roomName?: unknown;
    readonly identity?: unknown;
    readonly isHost?: boolean;
    readonly participantId?: string | null;
}

const extractString = (value: unknown, preferredKeys: readonly string[] = []): string | null => {
    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : null;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
    }

    if (value && typeof value === 'object') {
        for (const key of preferredKeys) {
            const candidate = (value as Record<string, unknown>)[key];
            if (typeof candidate === 'string') {
                const trimmed = candidate.trim();
                if (trimmed.length > 0) {
                    return trimmed;
                }
            }
        }

        const explicitToString = (value as { toString?: () => string }).toString;
        if (typeof explicitToString === 'function') {
            const coerced = explicitToString.call(value);
            if (
                typeof coerced === 'string' &&
                coerced.trim().length > 0 &&
                coerced !== '[object Object]'
            ) {
                return coerced.trim();
            }
        }
    }

    return null;
};

const normalizeSession = (
    raw: RawCallSession | null | undefined
): CallSessionCredentials | null => {
    if (!raw) {
        return null;
    }

    const token = extractString(raw.token, ['token', 'value', 'jwt', 'accessToken']);
    const url = extractString(raw.url, ['url', 'href']);
    const roomName = extractString(raw.roomName, ['roomName', 'name', 'room']);
    const identity = extractString(raw.identity, ['identity', 'id', 'userId']);

    if (!token || !url || !roomName || !identity) {
        return null;
    }

    return {
        token,
        url,
        roomName,
        identity,
        isHost: Boolean(raw.isHost),
        participantId: raw.participantId ?? null
    };
};

const callSessionQueryKey = (callId: string | null): readonly [string, string | null, string] => [
    'call-session',
    callId,
    'livekit'
];

export const useCallSession = (
    callId: string | null,
    enabled: boolean
): UseQueryResult<CallSessionCredentials | null, Error> => {
    return useQuery<CallSessionCredentials | null, Error>({
        queryKey: callSessionQueryKey(callId),
        enabled: Boolean(callId) && enabled,
        queryFn: async () => {
            if (!callId) {
                return null;
            }

            const response = await axiosInstance.post<RawCallSession>(`/calls/${callId}/session`);
            const normalized = normalizeSession(response.data);
            if (!normalized) {
                console.warn('Invalid call session payload', response.data);
            }
            return normalized;
        },
        refetchOnWindowFocus: false,
        staleTime: 60_000,
        gcTime: 5 * 60_000
    });
};
