import React from 'react';
import { useParams } from 'react-router-dom';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    IconButton,
    InputAdornment,
    Stack,
    TextField
} from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import type { MarkAsReadDto } from 'api/models/mark-as-read-dto';
import { ChannelResponseDtoTypeEnum } from 'api/models/channel-response-dto';
import type { MessageResponseDto } from 'api/models/message-response-dto';
import { apiClients } from 'services/api-clients';
import { useAppNavigate } from 'appHistory';
import { useAuthStore } from 'store/auth-store';
import type { Message } from 'features/messages/types/message';
import { WORKSPACE_DETAIL_QUERY_KEY } from 'features/workspaces/hooks/useWorkspaceDetails';
import type { UserProfileSnapshot } from 'features/users/types/user-profile-snapshot';
import { UserProfileDialog } from 'features/users/components/UserProfileDialog';
import SearchIcon from '@mui/icons-material/Search';
import { ChannelSidebar } from '../components/ChannelSidebar';
import { ChannelHeader } from '../components/ChannelHeader';
import { MessageList } from '../components/MessageList';
import { MessageComposer } from '../components/MessageComposer';
import { GroupConversationSettingsDialog } from '../components/GroupConversationSettingsDialog';
import { useWorkspaceChannels } from '../hooks/useWorkspaceChannels';
import { useChannelDetails } from '../hooks/useChannelDetails';
import { useChannelMessages } from '../hooks/useChannelMessages';
import { useSendMessage } from '../hooks/useSendMessage';
import { useChannelSocket } from '../hooks/useChannelSocket';

export const ChannelPage: React.FC = () => {
    const params = useParams<{ workspaceId?: string; channelId?: string }>();
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
    const [replyContext, setReplyContext] = React.useState<{
        messageId: string;
        authorName: string;
        snippet: string;
    } | null>(null);
    const [profileDialogState, setProfileDialogState] = React.useState<{
        userId: string;
        snapshot: UserProfileSnapshot;
    } | null>(null);
    const [isGroupSettingsOpen, setIsGroupSettingsOpen] = React.useState(false);
    const [isUpdatingGroup, setIsUpdatingGroup] = React.useState(false);
    const [isDeletingGroup, setIsDeletingGroup] = React.useState(false);
    const [searchTerm, setSearchTerm] = React.useState('');
    const [isSearchingMessages, setIsSearchingMessages] = React.useState(false);
    const [highlightedMessageId, setHighlightedMessageId] = React.useState<string | null>(null);

    useChannelSocket(channelId, workspaceId);

    const lastMarkedMessageRef = React.useRef<string | null>(null);
    const messagesRef = React.useRef<Message[]>(messages);
    const hasNextPageRef = React.useRef<boolean>(hasNextPage);
    const fetchNextPageRef = React.useRef(fetchNextPage);
    const highlightTimeoutRef = React.useRef<number | null>(null);

    React.useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    React.useEffect(() => {
        hasNextPageRef.current = hasNextPage;
    }, [hasNextPage]);

    React.useEffect(() => {
        fetchNextPageRef.current = fetchNextPage;
    }, [fetchNextPage]);

    React.useEffect(() => {
        return () => {
            if (highlightTimeoutRef.current) {
                window.clearTimeout(highlightTimeoutRef.current);
            }
        };
    }, []);

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
            if (workspaceId) {
                navigate(`/app/workspaces/${workspaceId}/channels/${nextChannelId}`);
            } else {
                navigate(`/app/conversations/${nextChannelId}`);
            }
        },
        [navigate, workspaceId]
    );

    const invalidateDirectMessages = React.useCallback(async (): Promise<void> => {
        await queryClient.invalidateQueries({ queryKey: ['direct-message-channels'] });
    }, [queryClient]);

    const ensureMessageLoaded = React.useCallback(async (messageId: string): Promise<boolean> => {
        if (messagesRef.current.some(message => message.id === messageId)) {
            return true;
        }

        const maxAttempts = 10;

        const loadUntilFound = async (attempts: number): Promise<boolean> => {
            if (attempts >= maxAttempts || !hasNextPageRef.current) {
                return messagesRef.current.some(message => message.id === messageId);
            }

            const fetchFn = fetchNextPageRef.current;
            if (!fetchFn) {
                return messagesRef.current.some(message => message.id === messageId);
            }

            try {
                await fetchFn();
            } catch (error) {
                console.error('Failed to fetch older messages:', error);
                return messagesRef.current.some(message => message.id === messageId);
            }

            // Allow React Query to update the cache before inspecting the list again
            await new Promise(resolve => window.setTimeout(resolve, 0));

            if (messagesRef.current.some(message => message.id === messageId)) {
                return true;
            }

            return loadUntilFound(attempts + 1);
        };

        return loadUntilFound(0);
    }, []);
    const triggerHighlight = React.useCallback((messageId: string) => {
        if (highlightTimeoutRef.current) {
            window.clearTimeout(highlightTimeoutRef.current);
        }

        // Reset first so highlighting the same message twice still flashes
        setHighlightedMessageId(null);
        window.requestAnimationFrame(() => {
            setHighlightedMessageId(messageId);
            highlightTimeoutRef.current = window.setTimeout(() => {
                setHighlightedMessageId(null);
                highlightTimeoutRef.current = null;
            }, 3500);
        });
    }, []);

    const handleSearchMessages = React.useCallback(async (): Promise<void> => {
        if (!channelId) {
            return;
        }
        if (isSearchingMessages) {
            return;
        }
        const trimmed = searchTerm.trim();
        if (!trimmed) {
            toast.error('Enter a search term to find messages.');
            return;
        }

        setIsSearchingMessages(true);
        try {
            const response = await apiClients.messages.messageControllerSearch(trimmed, channelId);
            const results = response.data as unknown as MessageResponseDto[];

            if (!Array.isArray(results) || results.length === 0) {
                toast('No messages matched your search.');
                return;
            }

            const targetMessageId = results[0]?.id;
            if (!targetMessageId) {
                toast.error('Search did not return a usable result.');
                return;
            }

            const isLoaded = await ensureMessageLoaded(targetMessageId);
            if (!isLoaded) {
                toast.error('We could not locate that message. Try loading older messages.');
                return;
            }

            triggerHighlight(targetMessageId);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to search messages';
            toast.error(message);
        } finally {
            setIsSearchingMessages(false);
        }
    }, [channelId, ensureMessageLoaded, isSearchingMessages, searchTerm, triggerHighlight]);

    const textChannels = React.useMemo(
        () => channels.filter(item => item.type === ChannelResponseDtoTypeEnum.Text),
        [channels]
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

    const isGroupConversation = channel?.type === ChannelResponseDtoTypeEnum.GroupDm;
    const isGroupOwner = channel?.creator?.id === currentUserId;
    const isGroupMember = Boolean(channel?.members.some(member => member.id === currentUserId));

    const handleOpenGroupSettings = React.useCallback(() => {
        setIsGroupSettingsOpen(true);
    }, []);

    const handleUpdateGroupConversation = React.useCallback(
        async (nextName: string) => {
            if (!channelId) {
                throw new Error('Channel ID is required');
            }
            setIsUpdatingGroup(true);
            try {
                await apiClients.channels.channelControllerUpdate(channelId, { name: nextName });
                await invalidateChannelDetails();
                await invalidateDirectMessages();
                toast.success('Conversation updated');
                setIsGroupSettingsOpen(false);
            } catch (error) {
                const message =
                    error instanceof Error ? error.message : 'Failed to update conversation';
                toast.error(message);
                throw error instanceof Error ? error : new Error(message);
            } finally {
                setIsUpdatingGroup(false);
            }
        },
        [channelId, invalidateChannelDetails, invalidateDirectMessages]
    );

    const handleDeleteGroupConversation = React.useCallback(async () => {
        if (!channelId) {
            throw new Error('Channel ID is required');
        }
        setIsDeletingGroup(true);
        try {
            await apiClients.channels.channelControllerRemove(channelId);
            await invalidateDirectMessages();
            toast.success('Conversation deleted');
            setIsGroupSettingsOpen(false);
            navigate('/app/conversations');
        } catch (error) {
            const message =
                error instanceof Error ? error.message : 'Failed to delete conversation';
            toast.error(message);
            throw error instanceof Error ? error : new Error(message);
        } finally {
            setIsDeletingGroup(false);
        }
    }, [channelId, invalidateDirectMessages, navigate]);

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

    const showWorkspaceSidebar = Boolean(workspaceId);
    const showBackToConversations = !workspaceId;

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
                    {showWorkspaceSidebar ? (
                        <ChannelSidebar
                            channels={textChannels}
                            activeChannelId={channelId}
                            isLoading={isChannelsLoading}
                            onSelectChannel={handleSelectChannel}
                            onOpenConversations={() => navigate('/app/conversations')}
                        />
                    ) : null}
                    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                        {showBackToConversations ? (
                            <Box sx={{ px: 3, pt: 3 }}>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={() => navigate('/app/conversations')}
                                >
                                    Back to conversations
                                </Button>
                            </Box>
                        ) : null}
                        <ChannelHeader
                            channel={channel}
                            isLoading={isChannelLoading}
                            onOpenGroupSettings={
                                isGroupConversation && isGroupMember
                                    ? handleOpenGroupSettings
                                    : undefined
                            }
                        />
                        <Box sx={{ px: 3, pb: 2 }}>
                            <TextField
                                fullWidth
                                size="small"
                                placeholder="Search messages in this channel"
                                value={searchTerm}
                                onChange={event => setSearchTerm(event.target.value)}
                                onKeyDown={event => {
                                    if (event.key === 'Enter') {
                                        event.preventDefault();
                                        void handleSearchMessages();
                                    }
                                }}
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            {isSearchingMessages ? (
                                                <CircularProgress size={18} />
                                            ) : (
                                                <IconButton
                                                    size="small"
                                                    onClick={() => {
                                                        void handleSearchMessages();
                                                    }}
                                                    disabled={isSearchingMessages}
                                                >
                                                    <SearchIcon fontSize="small" />
                                                </IconButton>
                                            )}
                                        </InputAdornment>
                                    )
                                }}
                            />
                        </Box>
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
                                    highlightedMessageId={highlightedMessageId}
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
            <GroupConversationSettingsDialog
                open={isGroupSettingsOpen}
                initialName={channel?.name ?? ''}
                canDelete={Boolean(isGroupConversation && isGroupOwner)}
                isSaving={isUpdatingGroup}
                isDeleting={isDeletingGroup}
                onClose={() => {
                    if (isUpdatingGroup || isDeletingGroup) {
                        return;
                    }
                    setIsGroupSettingsOpen(false);
                }}
                onSave={async nextName => {
                    await handleUpdateGroupConversation(nextName);
                }}
                onDelete={
                    isGroupConversation && isGroupOwner
                        ? async () => {
                              await handleDeleteGroupConversation();
                          }
                        : undefined
                }
            />
        </>
    );
};
