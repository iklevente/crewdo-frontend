import React from 'react';
import { CssBaseline, ThemeProvider } from '@mui/material';
import {
    QueryClient,
    QueryClientProvider,
    useQueryClient,
    type QueryKey
} from '@tanstack/react-query';
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
import { NOTIFICATIONS_QUERY_KEY } from 'features/notifications/hooks/useNotifications';
import { UNREAD_COUNT_QUERY_KEY } from 'features/notifications/hooks/useUnreadCount';

const PROJECTS_QUERY_KEY = ['projects'];
const TASKS_QUERY_KEY = ['project-tasks'];
const COMMENTS_QUERY_KEY = ['task-comments'];

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
                    {children}
                    <Toaster position="top-right" />
                </ThemeProvider>
            </SocketProvider>
        </QueryClientProvider>
    );
};

export { SocketEffects };

interface SocketEffectsProps {
    readonly showIncomingCall?: (call: {
        id: string;
        title?: string;
        type: 'voice' | 'video';
        initiator: {
            id: string;
            firstName: string;
            lastName: string;
        };
    }) => void;
}

const SocketEffects: React.FC<SocketEffectsProps> = ({ showIncomingCall }) => {
    const { socket } = useSocket();
    const queryClient = useQueryClient();

    React.useEffect(() => {
        if (!socket) {
            console.log('[Socket] No socket available');
            return;
        }

        console.log('[Socket] Setting up event listeners, connected:', socket.connected);

        const invalidate = (queryKey: QueryKey): void => {
            void queryClient.invalidateQueries({ queryKey });
        };

        const handleWorkspaceMemberAdded = (payload: {
            workspaceId: string;
            memberId: string;
        }): void => {
            const { workspaceId } = payload;
            invalidate(WORKSPACES_QUERY_KEY);
            invalidate(WORKSPACE_DETAIL_QUERY_KEY(workspaceId));
            invalidate(WORKSPACE_MEMBERS_QUERY_KEY(workspaceId));
            invalidate(WORKSPACE_CHANNELS_QUERY_KEY(workspaceId));
        };

        const handleWorkspaceMemberRemoved = (payload: {
            workspaceId: string;
            memberId: string;
        }): void => {
            const { workspaceId } = payload;
            invalidate(WORKSPACES_QUERY_KEY);
            invalidate(WORKSPACE_DETAIL_QUERY_KEY(workspaceId));
            invalidate(WORKSPACE_MEMBERS_QUERY_KEY(workspaceId));
            invalidate(WORKSPACE_CHANNELS_QUERY_KEY(workspaceId));
        };

        socket.on('workspace_member_added', handleWorkspaceMemberAdded);
        socket.on('workspace_member_removed', handleWorkspaceMemberRemoved);

        const invalidateWorkspace = (workspaceId: string | null): void => {
            invalidate(WORKSPACES_QUERY_KEY);

            if (!workspaceId) {
                return;
            }

            invalidate(WORKSPACE_DETAIL_QUERY_KEY(workspaceId));
            invalidate(WORKSPACE_MEMBERS_QUERY_KEY(workspaceId));
            invalidate(WORKSPACE_CHANNELS_QUERY_KEY(workspaceId));
        };

        const handleWorkspaceCreated = (payload: { workspaceId?: string | null }): void => {
            const workspaceId =
                typeof payload?.workspaceId === 'string' && payload.workspaceId.length > 0
                    ? payload.workspaceId
                    : null;

            console.log('[Socket] workspace_created received:', payload);
            invalidateWorkspace(workspaceId);
        };

        const handleWorkspaceUpdated = (payload: { workspaceId?: string | null }): void => {
            const workspaceId =
                typeof payload?.workspaceId === 'string' && payload.workspaceId.length > 0
                    ? payload.workspaceId
                    : null;

            console.log('[Socket] workspace_updated received:', payload);
            invalidateWorkspace(workspaceId);
        };

        const handleWorkspaceDeleted = (payload: { workspaceId?: string | null }): void => {
            const workspaceId =
                typeof payload?.workspaceId === 'string' && payload.workspaceId.length > 0
                    ? payload.workspaceId
                    : null;

            console.log('[Socket] workspace_deleted received:', payload);

            if (workspaceId) {
                queryClient.removeQueries({ queryKey: WORKSPACE_DETAIL_QUERY_KEY(workspaceId) });
                queryClient.removeQueries({ queryKey: WORKSPACE_MEMBERS_QUERY_KEY(workspaceId) });
                queryClient.removeQueries({ queryKey: WORKSPACE_CHANNELS_QUERY_KEY(workspaceId) });
            }

            invalidateWorkspace(workspaceId);
        };

        socket.on('workspace_created', handleWorkspaceCreated);
        socket.on('workspace_updated', handleWorkspaceUpdated);
        socket.on('workspace_deleted', handleWorkspaceDeleted);

        const refreshChannelCaches = (args: {
            channelId?: string | null;
            workspaceId?: string | null;
        }): void => {
            const channelId =
                typeof args.channelId === 'string' && args.channelId.length > 0
                    ? args.channelId
                    : null;
            const workspaceId =
                typeof args.workspaceId === 'string' && args.workspaceId.length > 0
                    ? args.workspaceId
                    : null;

            if (channelId) {
                invalidate(CHANNEL_DETAILS_QUERY_KEY(channelId));
                invalidate(CHANNEL_MESSAGES_QUERY_KEY(channelId));
            }

            if (workspaceId) {
                invalidate(WORKSPACE_CHANNELS_QUERY_KEY(workspaceId));
                invalidate(WORKSPACE_DETAIL_QUERY_KEY(workspaceId));
            } else {
                invalidate(DIRECT_MESSAGE_CHANNELS_QUERY_KEY);
            }

            invalidate(WORKSPACES_QUERY_KEY);
        };

        const handleChannelCreated = (payload: {
            channelId?: string | null;
            workspaceId?: string | null;
        }): void => {
            console.log('[Socket] channel_created received:', payload);
            refreshChannelCaches(payload);
        };

        const handleChannelUpdated = (payload: {
            channelId?: string | null;
            workspaceId?: string | null;
        }): void => {
            console.log('[Socket] channel_updated received:', payload);
            refreshChannelCaches(payload);
        };

        const handleChannelDeleted = (payload: {
            channelId?: string | null;
            workspaceId?: string | null;
        }): void => {
            console.log('[Socket] channel_deleted received:', payload);

            const channelId =
                typeof payload?.channelId === 'string' && payload.channelId.length > 0
                    ? payload.channelId
                    : null;
            const workspaceId =
                typeof payload?.workspaceId === 'string' && payload.workspaceId.length > 0
                    ? payload.workspaceId
                    : null;

            if (channelId) {
                queryClient.removeQueries({ queryKey: CHANNEL_DETAILS_QUERY_KEY(channelId) });
                queryClient.removeQueries({ queryKey: CHANNEL_MESSAGES_QUERY_KEY(channelId) });
            }

            refreshChannelCaches({ channelId, workspaceId });
        };

        socket.on('channel_created', handleChannelCreated);
        socket.on('channel_updated', handleChannelUpdated);
        socket.on('channel_deleted', handleChannelDeleted);

        const handleNewMessage = (payload: MessageResponseDto): void => {
            console.log('[Socket] new_message received, payload:', payload);

            const channelDetails = (payload?.channel ?? {}) as {
                id?: string;
                type?: string | null;
            };

            const channelId = typeof channelDetails.id === 'string' ? channelDetails.id : null;
            const normalizedType = (channelDetails.type ?? '').toString().toLowerCase();

            console.log('[Socket] new_message - channelId:', channelId, 'type:', normalizedType);

            if (channelId) {
                console.log('[Socket] Refetching channel queries for channelId:', channelId);
                invalidate(CHANNEL_DETAILS_QUERY_KEY(channelId));
                invalidate(CHANNEL_MESSAGES_QUERY_KEY(channelId));
            } else {
                console.warn(
                    '[Socket] No channelId found in message payload, refetching all message queries'
                );
                invalidate(['channel-messages']);
            }

            if (normalizedType === 'dm' || normalizedType === 'group_dm') {
                invalidate(DIRECT_MESSAGE_CHANNELS_QUERY_KEY);
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
                        invalidate(WORKSPACE_CHANNELS_QUERY_KEY(matchedWorkspaceId));
                        invalidate(WORKSPACE_DETAIL_QUERY_KEY(matchedWorkspaceId));
                    }
                    break;
                }
            }

            if (!matchedWorkspaceId) {
                invalidate(['workspace-channels']);
                invalidate(['workspace']);
            }

            invalidate(WORKSPACES_QUERY_KEY);
            invalidate(NOTIFICATIONS_QUERY_KEY);
            invalidate(UNREAD_COUNT_QUERY_KEY);
        };

        socket.on('new_message', handleNewMessage);

        const handleCallUpdated = (payload: RawCall): void => {
            console.log('[Socket] call_updated received:', payload);
            const normalized = normalizeCallSummary(payload);
            if (!normalized) {
                console.warn('[Socket] Failed to normalize call data');
                return;
            }

            console.log('[Socket] Invalidating calls queries for call:', normalized.id);
            // Invalidate queries to force refetch and re-render
            invalidate(CALLS_QUERY_KEY);

            // Also invalidate individual call query if someone is viewing it
            invalidate(CALL_QUERY_KEY(normalized.id));
        };

        socket.on('call_updated', handleCallUpdated);

        const handleIncomingCall = (payload: RawCall): void => {
            console.log('[Socket] incoming_call received:', payload);
            const normalized = normalizeCallSummary(payload);
            if (!normalized) {
                console.warn('[Socket] Failed to normalize incoming call data');
                return;
            }

            // Show the incoming call modal if handler is provided
            if (showIncomingCall) {
                showIncomingCall({
                    id: normalized.id,
                    title: normalized.title ?? undefined,
                    type: normalized.type as 'voice' | 'video',
                    initiator: {
                        id: normalized.initiator.id,
                        firstName: normalized.initiator.firstName ?? 'Unknown',
                        lastName: normalized.initiator.lastName ?? ''
                    }
                });
            }

            // Also invalidate calls queries
            invalidate(CALLS_QUERY_KEY);
        };

        socket.on('incoming_call', handleIncomingCall);

        // Project events
        const handleProjectCreated = (): void => {
            console.log('[Socket] project_created received - refetching queries');
            invalidate(PROJECTS_QUERY_KEY);
        };

        const handleProjectUpdated = (): void => {
            console.log('[Socket] project_updated received - refetching queries');
            invalidate(PROJECTS_QUERY_KEY);
        };

        const handleProjectDeleted = (): void => {
            console.log('[Socket] project_deleted received - refetching queries');
            invalidate(PROJECTS_QUERY_KEY);
        };

        // Task events
        const handleTaskCreated = (): void => {
            console.log('[Socket] task_created received - refetching queries');
            invalidate(TASKS_QUERY_KEY);
            invalidate(PROJECTS_QUERY_KEY);
        };

        const handleTaskUpdated = (): void => {
            console.log('[Socket] task_updated received - refetching queries');
            invalidate(TASKS_QUERY_KEY);
            invalidate(PROJECTS_QUERY_KEY);
        };

        const handleTaskDeleted = (): void => {
            console.log('[Socket] task_deleted received - refetching queries');
            invalidate(TASKS_QUERY_KEY);
            invalidate(PROJECTS_QUERY_KEY);
        };

        // Comment events
        const handleCommentCreated = (): void => {
            console.log('[Socket] comment_created received - refetching queries');
            invalidate(COMMENTS_QUERY_KEY);
            // Also refetch tasks to update comment counts
            invalidate(TASKS_QUERY_KEY);
        };

        const handleCommentUpdated = (): void => {
            console.log('[Socket] comment_updated received - refetching queries');
            invalidate(COMMENTS_QUERY_KEY);
        };

        const handleCommentDeleted = (): void => {
            console.log('[Socket] comment_deleted received - refetching queries');
            invalidate(COMMENTS_QUERY_KEY);
            // Also refetch tasks to update comment counts
            invalidate(TASKS_QUERY_KEY);
        };

        // Notification events
        const handleNotificationCreated = (): void => {
            console.log('[Socket] notification_created received - refetching queries');
            invalidate(NOTIFICATIONS_QUERY_KEY);
            invalidate(UNREAD_COUNT_QUERY_KEY);
        };

        const handleNotificationUpdated = (): void => {
            console.log('[Socket] notification_updated received - refetching queries');
            invalidate(NOTIFICATIONS_QUERY_KEY);
            invalidate(UNREAD_COUNT_QUERY_KEY);
        };

        const handleNotificationDeleted = (): void => {
            console.log('[Socket] notification_deleted received - refetching queries');
            invalidate(NOTIFICATIONS_QUERY_KEY);
            invalidate(UNREAD_COUNT_QUERY_KEY);
        };

        const handleNotificationsMarkedRead = (): void => {
            console.log('[Socket] notifications_marked_read received - refetching queries');
            invalidate(NOTIFICATIONS_QUERY_KEY);
            invalidate(UNREAD_COUNT_QUERY_KEY);
        };

        socket.on('project_created', handleProjectCreated);
        socket.on('project_updated', handleProjectUpdated);
        socket.on('project_deleted', handleProjectDeleted);
        socket.on('task_created', handleTaskCreated);
        socket.on('task_updated', handleTaskUpdated);
        socket.on('task_deleted', handleTaskDeleted);
        socket.on('comment_created', handleCommentCreated);
        socket.on('comment_updated', handleCommentUpdated);
        socket.on('comment_deleted', handleCommentDeleted);
        socket.on('notification_created', handleNotificationCreated);
        socket.on('notification_updated', handleNotificationUpdated);
        socket.on('notification_deleted', handleNotificationDeleted);
        socket.on('notifications_marked_read', handleNotificationsMarkedRead);

        return () => {
            socket.off('workspace_member_added', handleWorkspaceMemberAdded);
            socket.off('workspace_member_removed', handleWorkspaceMemberRemoved);
            socket.off('workspace_created', handleWorkspaceCreated);
            socket.off('workspace_updated', handleWorkspaceUpdated);
            socket.off('workspace_deleted', handleWorkspaceDeleted);
            socket.off('channel_created', handleChannelCreated);
            socket.off('channel_updated', handleChannelUpdated);
            socket.off('channel_deleted', handleChannelDeleted);
            socket.off('new_message', handleNewMessage);
            socket.off('call_updated', handleCallUpdated);
            socket.off('incoming_call', handleIncomingCall);
            socket.off('project_created', handleProjectCreated);
            socket.off('project_updated', handleProjectUpdated);
            socket.off('project_deleted', handleProjectDeleted);
            socket.off('task_created', handleTaskCreated);
            socket.off('task_updated', handleTaskUpdated);
            socket.off('task_deleted', handleTaskDeleted);
            socket.off('comment_created', handleCommentCreated);
            socket.off('comment_updated', handleCommentUpdated);
            socket.off('comment_deleted', handleCommentDeleted);
            socket.off('notification_created', handleNotificationCreated);
            socket.off('notification_updated', handleNotificationUpdated);
            socket.off('notification_deleted', handleNotificationDeleted);
            socket.off('notifications_marked_read', handleNotificationsMarkedRead);
        };
    }, [socket, queryClient, showIncomingCall]);

    return null;
};
