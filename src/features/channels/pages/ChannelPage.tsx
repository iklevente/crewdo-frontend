import React from 'react';
import { useParams } from 'react-router-dom';
import { Alert, Box, CircularProgress, Stack } from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import type { MarkAsReadDto } from 'api/models/mark-as-read-dto';
import type { CreateDirectMessageDto } from 'api/models/create-direct-message-dto';
import type { ChannelResponseDto } from 'api/models/channel-response-dto';
import { ChannelResponseDtoTypeEnum } from 'api/models/channel-response-dto';
import { apiClients } from 'services/api-clients';
import { useAppNavigate } from 'appHistory';
import { useAuthStore } from 'store/auth-store';
import type { Message } from 'features/messages/types/message';
import {
    WORKSPACE_DETAIL_QUERY_KEY,
    useWorkspaceDetails
} from 'features/workspaces/hooks/useWorkspaceDetails';
import type { UserProfileSnapshot } from 'features/users/types/user-profile-snapshot';
import { UserProfileDialog } from 'features/users/components/UserProfileDialog';
import { ChannelSidebar } from '../components/ChannelSidebar';
import { ChannelHeader } from '../components/ChannelHeader';
import { MessageList } from '../components/MessageList';
import { MessageComposer } from '../components/MessageComposer';
import { useWorkspaceChannels } from '../hooks/useWorkspaceChannels';
import { useChannelDetails } from '../hooks/useChannelDetails';
import { useChannelMessages } from '../hooks/useChannelMessages';
import { useSendMessage } from '../hooks/useSendMessage';
import { useChannelSocket } from '../hooks/useChannelSocket';
import { useDirectMessageChannels } from '../hooks/useDirectMessageChannels';
import { GroupConversationDialog } from '../components/GroupConversationDialog';
import { mapChannelResponse } from '../types/channel';

export const ChannelPage: React.FC = () => {
    const params = useParams<{ workspaceId: string; channelId: string }>();
    const navigate = useAppNavigate();
    const workspaceId = params.workspaceId ?? null;
    const channelId = params.channelId ?? null;
    const currentUserId = useAuthStore(state => state.user?.id ?? null);
    const queryClient = useQueryClient();

    const {
        channels,
        isLoading: isChannelsLoading,
        isError: isChannelsError,
        invalidate: invalidateWorkspaceChannels
    } = useWorkspaceChannels(workspaceId);
    const {
        channels: directMessageChannels,
        isLoading: isDirectMessagesLoading,
        invalidate: invalidateDirectMessages
    } = useDirectMessageChannels();
    const { members, isMembersLoading } = useWorkspaceDetails(workspaceId);
    const {
        channel,
        isLoading: isChannelLoading,
        isError: isChannelError,
        invalidate: invalidateChannelDetails
    } = useChannelDetails(channelId);
    const {
        messages,
        isInitialLoading,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        invalidate: invalidateMessages
    } = useChannelMessages(channelId);
    const { sendMessage, isSending } = useSendMessage({ channelId, workspaceId });
    const [isUploadingAttachments, setIsUploadingAttachments] = React.useState(false);
    const [isCreatingConversation, setIsCreatingConversation] = React.useState(false);
    const [replyContext, setReplyContext] = React.useState<{
        messageId: string;
        authorName: string;
        snippet: string;
    } | null>(null);
    const [profileDialogState, setProfileDialogState] = React.useState<{
        userId: string;
        snapshot: UserProfileSnapshot;
    } | null>(null);
    const [isGroupDialogOpen, setIsGroupDialogOpen] = React.useState(false);

    useChannelSocket(channelId, workspaceId);

    const lastMarkedMessageRef = React.useRef<string | null>(null);

    const markChannelAsRead = React.useCallback(
        async (upToMessageId: string) => {
            if (!channelId) {
                return;
            }
            const payload: MarkAsReadDto = {
                upToMessageId
            };
            try {
                await apiClients.messages.messageControllerMarkChannelAsRead(channelId, payload);
                void invalidateWorkspaceChannels();
                void invalidateChannelDetails();
                if (workspaceId) {
                    void queryClient.invalidateQueries({
                        queryKey: WORKSPACE_DETAIL_QUERY_KEY(workspaceId)
                    });
                }
            } catch (error) {
                const message =
                    error instanceof Error ? error.message : 'Failed to update read status';
                toast.error(message);
            }
        },
        [channelId, invalidateChannelDetails, invalidateWorkspaceChannels, queryClient, workspaceId]
    );

    React.useEffect(() => {
        if (!channelId || messages.length === 0) {
            return;
        }
        const latestMessageId = messages[messages.length - 1]?.id;
        if (!latestMessageId) {
            return;
        }
        if (lastMarkedMessageRef.current === latestMessageId) {
            return;
        }
        lastMarkedMessageRef.current = latestMessageId;
        void markChannelAsRead(latestMessageId);
    }, [channelId, markChannelAsRead, messages]);

    const handleSelectChannel = React.useCallback(
        (nextChannelId: string) => {
            if (!workspaceId) {
                return;
            }
            navigate(`/app/workspaces/${workspaceId}/channels/${nextChannelId}`);
        },
        [navigate, workspaceId]
    );

    const textChannels = React.useMemo(
        () => channels.filter(item => item.type === ChannelResponseDtoTypeEnum.Text),
        [channels]
    );

    const oneToOneChannels = React.useMemo(
        () => directMessageChannels.filter(item => item.type === ChannelResponseDtoTypeEnum.Dm),
        [directMessageChannels]
    );

    const groupConversationChannels = React.useMemo(
        () =>
            directMessageChannels.filter(item => item.type === ChannelResponseDtoTypeEnum.GroupDm),
        [directMessageChannels]
    );

    const handleStartDirectMessage = React.useCallback(
        async (userId: string) => {
            if (!workspaceId || !userId) {
                return;
            }

            setIsCreatingConversation(true);
            const payload: CreateDirectMessageDto = {
                userIds: [userId]
            };

            try {
                const response =
                    await apiClients.channels.channelControllerCreateDirectMessage(payload);
                const createdChannel = mapChannelResponse(
                    response.data as unknown as ChannelResponseDto
                );
                await invalidateDirectMessages();
                navigate(`/app/workspaces/${workspaceId}/channels/${createdChannel.id}`);
            } catch (error) {
                const message =
                    error instanceof Error ? error.message : 'Failed to start direct message';
                toast.error(message);
            } finally {
                setIsCreatingConversation(false);
            }
        },
        [invalidateDirectMessages, navigate, workspaceId]
    );

    const handleCreateGroupConversation = React.useCallback(
        async ({ participantIds, name }: { participantIds: string[]; name?: string }) => {
            if (!workspaceId) {
                throw new Error('Workspace context missing');
            }
            setIsCreatingConversation(true);
            const payload: CreateDirectMessageDto = {
                userIds: participantIds,
                name
            };
            try {
                const response =
                    await apiClients.channels.channelControllerCreateDirectMessage(payload);
                const createdChannel = mapChannelResponse(
                    response.data as unknown as ChannelResponseDto
                );
                await invalidateDirectMessages();
                setIsGroupDialogOpen(false);
                navigate(`/app/workspaces/${workspaceId}/channels/${createdChannel.id}`);
            } catch (error) {
                const message =
                    error instanceof Error ? error.message : 'Failed to create group conversation';
                toast.error(message);
                throw error instanceof Error ? error : new Error(message);
            } finally {
                setIsCreatingConversation(false);
            }
        },
        [invalidateDirectMessages, navigate, workspaceId]
    );

    const handleUserClick = React.useCallback((userId: string, snapshot: UserProfileSnapshot) => {
        setProfileDialogState({ userId, snapshot });
    }, []);

    const handleCloseProfileDialog = React.useCallback(() => {
        setProfileDialogState(null);
    }, []);

    const handleSendMessage = React.useCallback(
        async ({
            content,
            attachments,
            parentMessageId
        }: {
            content: string;
            attachments: File[];
            parentMessageId?: string;
        }) => {
            const trimmed = content.trim();
            if (!trimmed) {
                throw new Error('Message cannot be empty');
            }

            let attachmentIds: string[] | undefined;

            if (attachments.length > 0) {
                if (!channelId) {
                    toast.error('Select a channel before attaching files.');
                    throw new Error('Channel ID is required');
                }

                const formData = new FormData();
                attachments.forEach(file => {
                    formData.append('files', file);
                });

                setIsUploadingAttachments(true);
                try {
                    const response =
                        await apiClients.messages.messageControllerUploadMessageAttachments(
                            channelId,
                            {
                                headers: { 'Content-Type': 'multipart/form-data' },
                                data: formData
                            }
                        );
                    const payload = response.data as unknown as { attachmentIds?: string[] };
                    attachmentIds = payload?.attachmentIds?.length
                        ? payload.attachmentIds
                        : undefined;
                } catch (error) {
                    const message =
                        error instanceof Error ? error.message : 'Failed to upload attachments';
                    toast.error(message);
                    throw error instanceof Error ? error : new Error(message);
                } finally {
                    setIsUploadingAttachments(false);
                }
            }

            const message = await sendMessage({ content: trimmed, attachmentIds, parentMessageId });
            if (!message) {
                throw new Error('Failed to send message');
            }
            lastMarkedMessageRef.current = message.id;
            await invalidateMessages();
            setReplyContext(null);
        },
        [channelId, invalidateMessages, sendMessage]
    );

    const isComposerBusy = isSending || isUploadingAttachments;

    const handleReplyRequest = React.useCallback((message: Message) => {
        const preferredName =
            `${message.author.firstName ?? ''} ${message.author.lastName ?? ''}`.trim();
        const fallbackEmail = message.author.email?.trim();
        const authorName = preferredName !== '' ? preferredName : (fallbackEmail ?? 'Unknown user');
        const snippet = message.content.slice(0, 160);
        setReplyContext({
            messageId: message.id,
            authorName,
            snippet
        });
    }, []);

    const handleToggleReaction = React.useCallback(
        async (messageId: string, emoji: string) => {
            try {
                await apiClients.messages.messageControllerAddReaction({
                    messageId,
                    emoji
                });
                await invalidateMessages();
            } catch (error) {
                const message =
                    error instanceof Error ? error.message : 'Failed to update reaction';
                toast.error(message);
                throw error instanceof Error ? error : new Error(message);
            }
        },
        [invalidateMessages]
    );

    const handleEditMessage = React.useCallback(
        async (messageId: string, content: string) => {
            try {
                await apiClients.messages.messageControllerUpdate(messageId, { content });
                await invalidateMessages();
                toast.success('Message updated');
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Failed to edit message';
                toast.error(message);
                throw error instanceof Error ? error : new Error(message);
            }
        },
        [invalidateMessages]
    );

    const handleDeleteMessage = React.useCallback(
        async (messageId: string) => {
            try {
                await apiClients.messages.messageControllerRemove(messageId);
                await invalidateMessages();
                toast.success('Message deleted');
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Failed to delete message';
                toast.error(message);
                throw error instanceof Error ? error : new Error(message);
            }
        },
        [invalidateMessages]
    );

    if (!workspaceId) {
        return (
            <Alert severity="warning">Workspace not found. Navigate from the workspace list.</Alert>
        );
    }

    if (!channelId) {
        return <Alert severity="info">Select a channel to continue.</Alert>;
    }

    if (isChannelsError || isChannelError) {
        return (
            <Alert severity="error">
                We could not load this channel. Please verify you have access and try again.
            </Alert>
        );
    }

    return (
        <>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Box
                    sx={{
                        display: 'flex',
                        borderRadius: 3,
                        border: theme => `1px solid ${theme.palette.divider}`,
                        overflow: 'hidden',
                        minHeight: 520,
                        bgcolor: 'background.paper'
                    }}
                >
                    <ChannelSidebar
                        channels={textChannels}
                        directMessages={oneToOneChannels}
                        groupChannels={groupConversationChannels}
                        members={members}
                        currentUserId={currentUserId}
                        activeChannelId={channelId}
                        isLoading={isChannelsLoading}
                        isDmLoading={isDirectMessagesLoading}
                        isMembersLoading={isMembersLoading}
                        isCreatingDm={isCreatingConversation}
                        onSelectChannel={handleSelectChannel}
                        onStartDirectMessage={handleStartDirectMessage}
                        onOpenGroupDialog={() => setIsGroupDialogOpen(true)}
                    />
                    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                        <ChannelHeader channel={channel} isLoading={isChannelLoading} />
                        {isChannelLoading && !channel ? (
                            <Stack sx={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                                <CircularProgress size={28} />
                            </Stack>
                        ) : (
                            <>
                                <MessageList
                                    messages={messages}
                                    hasMore={hasNextPage}
                                    isLoadingMore={isFetchingNextPage}
                                    isInitialLoading={isInitialLoading}
                                    onLoadMore={fetchNextPage}
                                    currentUserId={currentUserId}
                                    onReply={handleReplyRequest}
                                    onToggleReaction={handleToggleReaction}
                                    onEdit={handleEditMessage}
                                    onDelete={handleDeleteMessage}
                                    onUserClick={handleUserClick}
                                />
                                <Box
                                    sx={{
                                        borderTop: theme => `1px solid ${theme.palette.divider}`
                                    }}
                                >
                                    <MessageComposer
                                        onSend={handleSendMessage}
                                        isSending={isComposerBusy}
                                        replyTo={replyContext}
                                        onCancelReply={() => setReplyContext(null)}
                                    />
                                </Box>
                            </>
                        )}
                    </Box>
                </Box>
            </Box>
            <UserProfileDialog
                open={Boolean(profileDialogState)}
                userId={profileDialogState?.userId ?? null}
                snapshot={profileDialogState?.snapshot}
                onClose={handleCloseProfileDialog}
            />
            <GroupConversationDialog
                open={isGroupDialogOpen}
                members={members}
                currentUserId={currentUserId}
                isSubmitting={isCreatingConversation}
                onClose={() => {
                    if (isCreatingConversation) {
                        return;
                    }
                    setIsGroupDialogOpen(false);
                }}
                onCreate={async payload => {
                    await handleCreateGroupConversation(payload);
                }}
            />
        </>
    );
};
