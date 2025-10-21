import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import type { CreateChannelDto } from 'api/models/create-channel-dto';
import type { UpdateChannelDto } from 'api/models/update-channel-dto';
import { apiClients } from 'services/api-clients';
import { WORKSPACE_DETAIL_QUERY_KEY } from 'features/workspaces/hooks/useWorkspaceDetails';
import { WORKSPACES_QUERY_KEY } from 'features/workspaces/hooks/useWorkspaces';
import { WORKSPACE_CHANNELS_QUERY_KEY } from './useWorkspaceChannels';
import { CHANNEL_DETAILS_QUERY_KEY } from './useChannelDetails';

interface UseChannelManagementResult {
    readonly createChannel: (payload: CreateChannelDto) => Promise<void>;
    readonly updateChannel: (channelId: string, payload: UpdateChannelDto) => Promise<void>;
    readonly deleteChannel: (channelId: string) => Promise<void>;
    readonly addMember: (channelId: string, userId: string) => Promise<void>;
    readonly removeMember: (channelId: string, userId: string) => Promise<void>;
    readonly isBusy: boolean;
}

export const useChannelManagement = (workspaceId: string | null): UseChannelManagementResult => {
    const queryClient = useQueryClient();
    const pendingMutations = React.useRef(0);
    const [, forceRender] = React.useReducer(x => x + 1, 0);

    const setBusy = React.useCallback((delta: number) => {
        pendingMutations.current += delta;
        forceRender();
    }, []);

    const invalidateWorkspaceCaches = React.useCallback(async () => {
        if (!workspaceId) {
            return;
        }
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: WORKSPACE_CHANNELS_QUERY_KEY(workspaceId) }),
            queryClient.invalidateQueries({ queryKey: WORKSPACE_DETAIL_QUERY_KEY(workspaceId) }),
            queryClient.invalidateQueries({ queryKey: WORKSPACES_QUERY_KEY })
        ]);
    }, [queryClient, workspaceId]);

    const { mutateAsync: handleCreate } = useMutation({
        mutationFn: async (payload: CreateChannelDto) => {
            const response = await apiClients.channels.channelControllerCreate(payload);
            return response.data;
        },
        onSuccess: async () => {
            toast.success('Channel created');
            await invalidateWorkspaceCaches();
        },
        onError: error => {
            toast.error(error instanceof Error ? error.message : 'Failed to create channel');
        }
    });

    const { mutateAsync: handleUpdate } = useMutation({
        mutationFn: async ({
            channelId,
            payload
        }: {
            channelId: string;
            payload: UpdateChannelDto;
        }) => {
            const response = await apiClients.channels.channelControllerUpdate(channelId, payload);
            return response.data;
        },
        onSuccess: async (_data, variables) => {
            toast.success('Channel updated');
            await queryClient.invalidateQueries({
                queryKey: CHANNEL_DETAILS_QUERY_KEY(variables.channelId)
            });
            await invalidateWorkspaceCaches();
        },
        onError: error => {
            toast.error(error instanceof Error ? error.message : 'Failed to update channel');
        }
    });

    const { mutateAsync: handleDelete } = useMutation({
        mutationFn: async (channelId: string) => {
            await apiClients.channels.channelControllerRemove(channelId);
        },
        onSuccess: async (_data, channelId) => {
            toast.success('Channel deleted');
            await queryClient.invalidateQueries({ queryKey: CHANNEL_DETAILS_QUERY_KEY(channelId) });
            await invalidateWorkspaceCaches();
        },
        onError: error => {
            toast.error(error instanceof Error ? error.message : 'Failed to delete channel');
        }
    });

    const { mutateAsync: handleAddMember } = useMutation({
        mutationFn: async ({ channelId, userId }: { channelId: string; userId: string }) => {
            await apiClients.channels.channelControllerAddMember(channelId, userId);
        },
        onSuccess: async (_data, variables) => {
            toast.success('Member added to channel');
            await queryClient.invalidateQueries({
                queryKey: CHANNEL_DETAILS_QUERY_KEY(variables.channelId)
            });
        },
        onError: error => {
            toast.error(error instanceof Error ? error.message : 'Failed to add member');
        }
    });

    const { mutateAsync: handleRemoveMember } = useMutation({
        mutationFn: async ({ channelId, userId }: { channelId: string; userId: string }) => {
            await apiClients.channels.channelControllerRemoveMember(channelId, userId);
        },
        onSuccess: async (_data, variables) => {
            toast.success('Member removed from channel');
            await queryClient.invalidateQueries({
                queryKey: CHANNEL_DETAILS_QUERY_KEY(variables.channelId)
            });
        },
        onError: error => {
            toast.error(error instanceof Error ? error.message : 'Failed to remove member');
        }
    });

    const wrap = React.useCallback(
        async <T>(action: () => Promise<T>): Promise<T> => {
            setBusy(1);
            try {
                return await action();
            } finally {
                setBusy(-1);
            }
        },
        [setBusy]
    );

    return {
        createChannel: React.useCallback(
            async (payload: CreateChannelDto) => {
                await wrap(async () => {
                    await handleCreate(payload);
                });
            },
            [handleCreate, wrap]
        ),
        updateChannel: React.useCallback(
            async (channelId: string, payload: UpdateChannelDto) => {
                await wrap(async () => {
                    await handleUpdate({ channelId, payload });
                });
            },
            [handleUpdate, wrap]
        ),
        deleteChannel: React.useCallback(
            async (channelId: string) => {
                await wrap(async () => {
                    await handleDelete(channelId);
                });
            },
            [handleDelete, wrap]
        ),
        addMember: React.useCallback(
            async (channelId: string, userId: string) => {
                await wrap(async () => {
                    await handleAddMember({ channelId, userId });
                });
            },
            [handleAddMember, wrap]
        ),
        removeMember: React.useCallback(
            async (channelId: string, userId: string) => {
                await wrap(async () => {
                    await handleRemoveMember({ channelId, userId });
                });
            },
            [handleRemoveMember, wrap]
        ),
        isBusy: pendingMutations.current > 0
    };
};
