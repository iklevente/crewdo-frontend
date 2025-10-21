import React from 'react';
import { useQueryClient, type InfiniteData } from '@tanstack/react-query';
import type { MessageResponseDto } from 'api/models/message-response-dto';
import type { Message, MessageHistoryResponse } from 'features/messages/types/message';
import { mapMessageResponse } from 'features/messages/types/message';
import { useSocket } from 'services/socket-context';
import {
    WORKSPACE_DETAIL_QUERY_KEY,
    WORKSPACE_MEMBERS_QUERY_KEY
} from 'features/workspaces/hooks/useWorkspaceDetails';
import { CHANNEL_MESSAGES_QUERY_KEY } from './useChannelMessages';
import { CHANNEL_DETAILS_QUERY_KEY } from './useChannelDetails';
import { WORKSPACE_CHANNELS_QUERY_KEY } from './useWorkspaceChannels';

export const useChannelSocket = (channelId: string | null, workspaceId: string | null): void => {
    const { socket, joinChannel, leaveChannel } = useSocket();
    const queryClient = useQueryClient();

    const updateMessageCache = React.useCallback(
        (targetChannelId: string, message: Message) => {
            queryClient.setQueryData<InfiniteData<MessageHistoryResponse>>(
                CHANNEL_MESSAGES_QUERY_KEY(targetChannelId),
                existing => {
                    if (!existing) {
                        return existing;
                    }

                    const dedupedPages = existing.pages.map(page => ({
                        ...page,
                        messages: page.messages.filter(
                            existingMessage => existingMessage.id !== message.id
                        )
                    }));

                    const [firstPage, ...restPages] = dedupedPages;
                    if (!firstPage) {
                        return {
                            pageParams: existing.pageParams,
                            pages: [
                                {
                                    hasMore: false,
                                    nextCursor: undefined,
                                    messages: [message]
                                },
                                ...restPages
                            ]
                        };
                    }

                    return {
                        pageParams: existing.pageParams,
                        pages: [
                            {
                                ...firstPage,
                                messages: [message, ...firstPage.messages]
                            },
                            ...restPages
                        ]
                    };
                }
            );
        },
        [queryClient]
    );

    React.useEffect(() => {
        if (!channelId) {
            return;
        }
        joinChannel(channelId);
        return () => {
            leaveChannel(channelId);
        };
    }, [channelId, joinChannel, leaveChannel]);

    React.useEffect(() => {
        if (!socket) {
            return;
        }

        const handleNewMessage = (payload: MessageResponseDto): void => {
            const message = mapMessageResponse(payload);
            const targetChannelId = message.channel.id;
            updateMessageCache(targetChannelId, message);
            void queryClient.invalidateQueries({
                queryKey: CHANNEL_DETAILS_QUERY_KEY(targetChannelId)
            });
            if (workspaceId) {
                void queryClient.invalidateQueries({
                    queryKey: WORKSPACE_CHANNELS_QUERY_KEY(workspaceId)
                });
                void queryClient.invalidateQueries({
                    queryKey: WORKSPACE_DETAIL_QUERY_KEY(workspaceId)
                });
            }
        };

        const handleMessagesRead = (payload: { channelId: string }): void => {
            const targetChannelId = payload.channelId;
            void queryClient.invalidateQueries({
                queryKey: CHANNEL_DETAILS_QUERY_KEY(targetChannelId)
            });
            if (workspaceId) {
                void queryClient.invalidateQueries({
                    queryKey: WORKSPACE_CHANNELS_QUERY_KEY(workspaceId)
                });
                void queryClient.invalidateQueries({
                    queryKey: WORKSPACE_DETAIL_QUERY_KEY(workspaceId)
                });
            }
        };

        const handleUserJoinedChannel = (payload: { channelId: string }): void => {
            if (payload.channelId === channelId) {
                if (workspaceId) {
                    void queryClient.invalidateQueries({
                        queryKey: WORKSPACE_MEMBERS_QUERY_KEY(workspaceId)
                    });
                }
                void queryClient.invalidateQueries({
                    queryKey: CHANNEL_DETAILS_QUERY_KEY(channelId)
                });
            }
        };

        const handleUserLeftChannel = (payload: { channelId: string }): void => {
            if (payload.channelId === channelId) {
                if (workspaceId) {
                    void queryClient.invalidateQueries({
                        queryKey: WORKSPACE_MEMBERS_QUERY_KEY(workspaceId)
                    });
                }
                void queryClient.invalidateQueries({
                    queryKey: CHANNEL_DETAILS_QUERY_KEY(channelId)
                });
            }
        };

        socket.on('new_message', handleNewMessage);
        socket.on('messages_read', handleMessagesRead);
        socket.on('user_joined_channel', handleUserJoinedChannel);
        socket.on('user_left_channel', handleUserLeftChannel);

        return () => {
            socket.off('new_message', handleNewMessage);
            socket.off('messages_read', handleMessagesRead);
            socket.off('user_joined_channel', handleUserJoinedChannel);
            socket.off('user_left_channel', handleUserLeftChannel);
        };
    }, [socket, queryClient, workspaceId, channelId, updateMessageCache]);
};
