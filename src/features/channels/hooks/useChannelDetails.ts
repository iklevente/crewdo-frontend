import { useQuery, useQueryClient } from '@tanstack/react-query';
import React from 'react';
import type { ChannelResponseDto } from 'api/models/channel-response-dto';
import { apiClients } from 'services/api-clients';
import { mapChannelResponse, type Channel } from '../types/channel';

export const CHANNEL_DETAILS_QUERY_KEY = (channelId: string): [string, string] => [
    'channel',
    channelId
];

interface UseChannelDetailsResult {
    readonly channel: Channel | undefined;
    readonly isLoading: boolean;
    readonly isError: boolean;
    readonly invalidate: () => Promise<void>;
}

export const useChannelDetails = (channelId: string | null): UseChannelDetailsResult => {
    const queryClient = useQueryClient();
    const {
        data: channel,
        isLoading,
        isError
    } = useQuery<Channel>({
        queryKey: CHANNEL_DETAILS_QUERY_KEY(channelId ?? ''),
        queryFn: async () => {
            if (!channelId) {
                throw new Error('Channel ID is required');
            }
            const response = await apiClients.channels.channelControllerFindOne(channelId);
            const payload = response.data as unknown as ChannelResponseDto;
            return mapChannelResponse(payload);
        },
        enabled: Boolean(channelId)
    });

    const invalidate = React.useCallback(async (): Promise<void> => {
        if (!channelId) {
            return;
        }
        await queryClient.invalidateQueries({ queryKey: CHANNEL_DETAILS_QUERY_KEY(channelId) });
    }, [channelId, queryClient]);

    return {
        channel,
        isLoading,
        isError,
        invalidate
    };
};
