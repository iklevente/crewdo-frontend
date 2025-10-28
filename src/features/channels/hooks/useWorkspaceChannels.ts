import { useQuery, useQueryClient } from '@tanstack/react-query';
import React from 'react';
import type { ChannelResponseDto } from 'api/models/channel-response-dto';
import { apiClients } from 'services/api-clients';
import { mapChannelResponse, type Channel } from '../types/channel';

export const WORKSPACE_CHANNELS_QUERY_KEY = (workspaceId: string): [string, string] => [
    'workspace-channels',
    workspaceId
];

interface UseWorkspaceChannelsResult {
    readonly channels: Channel[];
    readonly isLoading: boolean;
    readonly isError: boolean;
    readonly invalidate: () => Promise<void>;
}

export const useWorkspaceChannels = (workspaceId: string | null): UseWorkspaceChannelsResult => {
    const queryClient = useQueryClient();
    const {
        data: channels = [],
        isLoading,
        isError
    } = useQuery<Channel[]>({
        queryKey: WORKSPACE_CHANNELS_QUERY_KEY(workspaceId ?? ''),
        queryFn: async () => {
            if (!workspaceId) {
                throw new Error('Workspace ID is required');
            }
            const response =
                await apiClients.channels.channelControllerFindByWorkspace(workspaceId);
            const payload = response.data as unknown as ChannelResponseDto[];
            return payload.map(mapChannelResponse);
        },
        enabled: Boolean(workspaceId)
    });

    const invalidate = React.useCallback(async (): Promise<void> => {
        if (!workspaceId) {
            return;
        }
        await queryClient.invalidateQueries({
            queryKey: WORKSPACE_CHANNELS_QUERY_KEY(workspaceId)
        });
    }, [queryClient, workspaceId]);

    return {
        channels,
        isLoading,
        isError,
        invalidate
    };
};
