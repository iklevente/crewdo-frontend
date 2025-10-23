import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ChannelResponseDto } from 'api/models/channel-response-dto';
import { apiClients } from 'services/api-clients';
import { mapChannelResponse, type Channel } from '../types/channel';

const DIRECT_MESSAGE_CHANNELS_QUERY_KEY = ['direct-message-channels'];

interface UseDirectMessageChannelsResult {
    readonly channels: Channel[];
    readonly isLoading: boolean;
    readonly isError: boolean;
    readonly refetch: () => Promise<unknown>;
    readonly invalidate: () => Promise<void>;
}

export const useDirectMessageChannels = (): UseDirectMessageChannelsResult => {
    const queryClient = useQueryClient();
    const {
        data: channels = [],
        isLoading,
        isError,
        refetch
    } = useQuery<Channel[]>({
        queryKey: DIRECT_MESSAGE_CHANNELS_QUERY_KEY,
        queryFn: async () => {
            const response = await apiClients.channels.channelControllerFindDirectMessages();
            const payload = response.data as unknown as ChannelResponseDto[];
            return payload.map(mapChannelResponse);
        },
        refetchInterval: 15000,
        refetchIntervalInBackground: true
    });

    const invalidate = React.useCallback(async (): Promise<void> => {
        await queryClient.invalidateQueries({ queryKey: DIRECT_MESSAGE_CHANNELS_QUERY_KEY });
    }, [queryClient]);

    return {
        channels,
        isLoading,
        isError,
        refetch,
        invalidate
    };
};
