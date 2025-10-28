import React from 'react';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { muiTheme } from 'theme';
import { SocketProvider, useSocket } from 'services/socket-context';
import type { MessageResponseDto } from 'api/models/message-response-dto';
import { WORKSPACES_QUERY_KEY } from 'features/workspaces/hooks/useWorkspaces';
import {
    WORKSPACE_DETAIL_QUERY_KEY,
    WORKSPACE_MEMBERS_QUERY_KEY
} from 'features/workspaces/hooks/useWorkspaceDetails';
import { WORKSPACE_CHANNELS_QUERY_KEY } from 'features/channels/hooks/useWorkspaceChannels';
import { CHANNEL_DETAILS_QUERY_KEY } from 'features/channels/hooks/useChannelDetails';
import { CHANNEL_MESSAGES_QUERY_KEY } from 'features/channels/hooks/useChannelMessages';
import { DIRECT_MESSAGE_CHANNELS_QUERY_KEY } from 'features/channels/hooks/useDirectMessageChannels';
import { CALLS_QUERY_KEY, normalizeCallSummary, type RawCall } from 'features/calls/hooks/useCalls';
import { CALL_QUERY_KEY } from 'features/calls/hooks/useCallById';
import type { CallSummary } from 'features/calls/types/call';

const createQueryClient = (): QueryClient =>
    new QueryClient({
        defaultOptions: {
            queries: {
                refetchOnWindowFocus: false,
                retry: 1,
                staleTime: 60 * 1000
            },
            mutations: {
                retry: 1
            }
        }
    });

export const AppProviders: React.FC<React.PropsWithChildren> = ({ children }) => {
    const queryClientRef = React.useRef<QueryClient | null>(null);

    queryClientRef.current ??= createQueryClient();

    const queryClient = queryClientRef.current;

    if (!queryClient) {
        throw new Error('Query client failed to initialize');
    }

    return (
        <QueryClientProvider client={queryClient}>
            <SocketProvider>
                <ThemeProvider theme={muiTheme}>
                    <CssBaseline />
                    <SocketEffects />
                    {children}
                    <Toaster position="top-right" />
                </ThemeProvider>
            </SocketProvider>
        </QueryClientProvider>
    );
};

const SocketEffects: React.FC = () => {
    const { socket } = useSocket();
    const queryClient = useQueryClient();

    React.useEffect(() => {
        if (!socket) {
            return;
        }

        const handleWorkspaceMemberAdded = (payload: {
            workspaceId: string;
            member: { id: string };
        }): void => {
            const { workspaceId } = payload;
            void queryClient.invalidateQueries({ queryKey: WORKSPACES_QUERY_KEY });
            void queryClient.invalidateQueries({
                queryKey: WORKSPACE_DETAIL_QUERY_KEY(workspaceId)
            });
            void queryClient.invalidateQueries({
                queryKey: WORKSPACE_MEMBERS_QUERY_KEY(workspaceId)
            });
            void queryClient.invalidateQueries({
                queryKey: WORKSPACE_CHANNELS_QUERY_KEY(workspaceId)
            });
        };

        const handleWorkspaceMemberRemoved = (payload: {
            workspaceId: string;
            memberId: string;
        }): void => {
            const { workspaceId } = payload;
            void queryClient.invalidateQueries({ queryKey: WORKSPACES_QUERY_KEY });
            void queryClient.invalidateQueries({
                queryKey: WORKSPACE_DETAIL_QUERY_KEY(workspaceId)
            });
            void queryClient.invalidateQueries({
                queryKey: WORKSPACE_MEMBERS_QUERY_KEY(workspaceId)
            });
            void queryClient.invalidateQueries({
                queryKey: WORKSPACE_CHANNELS_QUERY_KEY(workspaceId)
            });
        };

        socket.on('workspace_member_added', handleWorkspaceMemberAdded);
        socket.on('workspace_member_removed', handleWorkspaceMemberRemoved);

        const handleNewMessage = (payload: MessageResponseDto): void => {
            const channelDetails = (payload?.channel ?? {}) as {
                id?: string;
                type?: string | null;
            };

            const channelId = typeof channelDetails.id === 'string' ? channelDetails.id : null;
            const normalizedType = (channelDetails.type ?? '').toString().toLowerCase();

            if (channelId) {
                void queryClient.invalidateQueries({
                    queryKey: CHANNEL_DETAILS_QUERY_KEY(channelId)
                });
                void queryClient.invalidateQueries({
                    queryKey: CHANNEL_MESSAGES_QUERY_KEY(channelId)
                });
            }

            if (normalizedType === 'dm' || normalizedType === 'group_dm') {
                void queryClient.invalidateQueries({
                    queryKey: DIRECT_MESSAGE_CHANNELS_QUERY_KEY
                });
                return;
            }

            let matchedWorkspaceId: string | null = null;

            if (channelId) {
                const workspaceChannelEntries = queryClient.getQueriesData<{ id?: string }[]>({
                    queryKey: ['workspace-channels']
                });

                for (const [queryKey, data] of workspaceChannelEntries) {
                    if (!Array.isArray(data)) {
                        continue;
                    }

                    const belongsToWorkspace = data.some(channel => {
                        return (
                            channel !== null &&
                            typeof channel === 'object' &&
                            'id' in channel &&
                            (channel as { id?: string }).id === channelId
                        );
                    });

                    if (!belongsToWorkspace) {
                        continue;
                    }

                    const typedKey = queryKey as [string, string];
                    matchedWorkspaceId =
                        typedKey?.length > 1 && typeof typedKey[1] === 'string'
                            ? typedKey[1]
                            : null;

                    if (matchedWorkspaceId) {
                        void queryClient.invalidateQueries({
                            queryKey: WORKSPACE_CHANNELS_QUERY_KEY(matchedWorkspaceId)
                        });
                        void queryClient.invalidateQueries({
                            queryKey: WORKSPACE_DETAIL_QUERY_KEY(matchedWorkspaceId)
                        });
                    }
                    break;
                }
            }

            if (!matchedWorkspaceId) {
                void queryClient.invalidateQueries({ queryKey: ['workspace-channels'] });
                void queryClient.invalidateQueries({ queryKey: ['workspace'] });
            }

            void queryClient.invalidateQueries({ queryKey: WORKSPACES_QUERY_KEY });
        };

        socket.on('new_message', handleNewMessage);

        const handleCallUpdated = (payload: RawCall): void => {
            const normalized = normalizeCallSummary(payload);
            if (!normalized) {
                return;
            }

            queryClient.setQueryData<CallSummary[]>(CALLS_QUERY_KEY, existing => {
                if (!existing) {
                    return [normalized];
                }

                const index = existing.findIndex(call => call.id === normalized.id);
                if (index === -1) {
                    return [normalized, ...existing];
                }

                const next = existing.slice();
                next[index] = normalized;
                return next;
            });

            queryClient.setQueryData<CallSummary | null>(CALL_QUERY_KEY(normalized.id), current => {
                if (!current) {
                    return normalized;
                }
                return current.id === normalized.id ? normalized : current;
            });
        };

        socket.on('call_updated', handleCallUpdated);

        return () => {
            socket.off('workspace_member_added', handleWorkspaceMemberAdded);
            socket.off('workspace_member_removed', handleWorkspaceMemberRemoved);
            socket.off('new_message', handleNewMessage);
            socket.off('call_updated', handleCallUpdated);
        };
    }, [socket, queryClient]);

    return null;
};
