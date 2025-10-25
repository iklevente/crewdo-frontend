import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { axiosInstance } from 'services/api-clients';
import type { CallSummary, CallParticipantSummary } from '../types/call';

export const CALLS_QUERY_KEY = ['calls', 'me'];

interface RawCallParticipant {
    readonly id?: string;
    readonly status?: string;
    readonly joinedAt?: string | null;
    readonly leftAt?: string | null;
    readonly isMuted?: boolean;
    readonly isVideoEnabled?: boolean;
    readonly isScreenSharing?: boolean;
    readonly isHandRaised?: boolean;
    readonly connectionQuality?: string | null;
    readonly user?: {
        readonly id?: string;
        readonly firstName?: string;
        readonly lastName?: string;
    };
}

export interface RawCall {
    readonly id?: string;
    readonly title?: string | null;
    readonly description?: string | null;
    readonly type?: string;
    readonly status?: string;
    readonly createdAt?: string;
    readonly updatedAt?: string;
    readonly startedAt?: string | null;
    readonly endedAt?: string | null;
    readonly scheduledStartTime?: string | null;
    readonly scheduledEndTime?: string | null;
    readonly roomName?: string | null;
    readonly initiator?: {
        readonly id?: string;
        readonly firstName?: string;
        readonly lastName?: string;
    };
    readonly participants?: RawCallParticipant[];
    readonly duration?: number | null;
    readonly maxParticipants?: number | null;
}

const normalizeParticipant = (participant: RawCallParticipant): CallParticipantSummary => {
    const status = (participant.status ?? 'invited').toLowerCase();
    const isJoined = status === 'joined';
    const generatedId = (() => {
        if (participant.id) {
            return participant.id;
        }
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return crypto.randomUUID();
        }
        return `participant-${Math.random().toString(36).slice(2)}`;
    })();

    return {
        id: generatedId,
        user: {
            id: participant.user?.id ?? 'unknown',
            firstName: participant.user?.firstName,
            lastName: participant.user?.lastName
        },
        status:
            status === 'joined' || status === 'left' || status === 'kicked' || status === 'declined'
                ? (status as CallParticipantSummary['status'])
                : 'invited',
        joinedAt: isJoined ? (participant.joinedAt ?? null) : null,
        leftAt: participant.leftAt ?? null,
        isMuted: isJoined ? Boolean(participant.isMuted) : false,
        isVideoEnabled: isJoined ? Boolean(participant.isVideoEnabled) : false,
        isScreenSharing: Boolean(participant.isScreenSharing),
        isHandRaised: Boolean(participant.isHandRaised),
        connectionQuality: participant.connectionQuality ?? null
    };
};

export const normalizeCallSummary = (raw: RawCall): CallSummary | null => {
    if (!raw?.id || !raw.type || !raw.status || !raw.createdAt || !raw.updatedAt) {
        return null;
    }

    const type = raw.type.toLowerCase();
    const status = raw.status.toLowerCase();

    if (!['voice', 'video', 'screen_share'].includes(type)) {
        return null;
    }

    if (!['scheduled', 'active', 'ended', 'cancelled'].includes(status)) {
        return null;
    }

    const participants = Array.isArray(raw.participants)
        ? raw.participants.map(item => normalizeParticipant(item))
        : [];

    return {
        id: raw.id,
        title: raw.title ?? null,
        description: raw.description ?? null,
        type: type as CallSummary['type'],
        status: status as CallSummary['status'],
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
        startedAt: raw.startedAt ?? null,
        endedAt: raw.endedAt ?? null,
        scheduledStartTime: raw.scheduledStartTime ?? null,
        scheduledEndTime: raw.scheduledEndTime ?? null,
        roomName: raw.roomName ?? null,
        initiator: {
            id: raw.initiator?.id ?? 'unknown',
            firstName: raw.initiator?.firstName,
            lastName: raw.initiator?.lastName
        },
        participants,
        duration: raw.duration ?? null,
        maxParticipants: raw.maxParticipants ?? null
    };
};

const fetchCalls = async (): Promise<CallSummary[]> => {
    try {
        const response = await axiosInstance.get<RawCall[]>('/calls');
        const payload = Array.isArray(response.data) ? response.data : [];
        return payload
            .map(item => normalizeCallSummary(item))
            .filter((item): item is CallSummary => item !== null);
    } catch (error) {
        console.warn('Failed to load calls:', error);
        return [];
    }
};

export const useCalls = (): {
    readonly calls: CallSummary[];
    readonly activeCalls: CallSummary[];
    readonly scheduledCalls: CallSummary[];
    readonly pastCalls: CallSummary[];
    readonly isLoading: boolean;
    readonly isError: boolean;
    readonly refetch: () => Promise<unknown>;
} => {
    const {
        data: calls = [],
        isLoading,
        isError,
        refetch
    } = useQuery<CallSummary[]>({
        queryKey: CALLS_QUERY_KEY,
        queryFn: fetchCalls,
        staleTime: 60_000,
        refetchOnMount: true,
        refetchOnReconnect: true
    });

    const { activeCalls, scheduledCalls, pastCalls } = useMemo(() => {
        const active = calls
            .filter(call => call.status === 'active')
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        const scheduled = calls
            .filter(call => call.status === 'scheduled')
            .sort((a, b) => {
                const aTime = a.scheduledStartTime ?? a.createdAt;
                const bTime = b.scheduledStartTime ?? b.createdAt;
                return new Date(aTime).getTime() - new Date(bTime).getTime();
            });
        const past = calls
            .filter(call => call.status === 'ended' || call.status === 'cancelled')
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        return { activeCalls: active, scheduledCalls: scheduled, pastCalls: past };
    }, [calls]);

    return {
        calls,
        activeCalls,
        scheduledCalls,
        pastCalls,
        isLoading,
        isError,
        refetch
    };
};
