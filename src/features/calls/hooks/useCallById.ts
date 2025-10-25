import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { axiosInstance } from 'services/api-clients';
import type { CallSummary } from '../types/call';
import { normalizeCallSummary, type RawCall } from './useCalls';

const callQueryKey = (callId: string | null): readonly [string, string | null] => ['call', callId];

export const useCallById = (callId: string | null): UseQueryResult<CallSummary | null> => {
    return useQuery<CallSummary | null>({
        queryKey: callQueryKey(callId),
        enabled: Boolean(callId),
        queryFn: async () => {
            if (!callId) {
                return null;
            }

            const response = await axiosInstance.get<RawCall>(`/calls/${callId}`);
            return normalizeCallSummary(response.data);
        },
        staleTime: 15_000,
        refetchInterval: 30_000
    });
};
