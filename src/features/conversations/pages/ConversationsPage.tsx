import React from 'react';
import {
    Alert,
    Avatar,
    Box,
    Button,
    CircularProgress,
    Divider,
    List,
    ListItemAvatar,
    ListItemButton,
    ListItemText,
    Stack,
    Tooltip,
    Typography
} from '@mui/material';
import ForumIcon from '@mui/icons-material/ForumOutlined';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import GroupAddIcon from '@mui/icons-material/GroupAddOutlined';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import type { CreateDirectMessageDto } from 'api/models/create-direct-message-dto';
import type { ChannelResponseDto } from 'api/models/channel-response-dto';
import { ChannelResponseDtoTypeEnum } from 'api/models/channel-response-dto';
import { apiClients } from 'services/api-clients';
import { useAppNavigate } from 'appHistory';
import { useAuthStore } from 'store/auth-store';
import { PresenceBadge } from 'components/PresenceBadge';
import { usePresence } from 'store/presence-store';
import { ChannelListItem } from 'features/channels/components/ChannelListItem';
import {
    useDirectMessageChannels,
    DIRECT_MESSAGE_CHANNELS_QUERY_KEY
} from 'features/channels/hooks/useDirectMessageChannels';
import { mapChannelResponse, type Channel } from 'features/channels/types/channel';
import type { WorkspaceMember } from 'features/workspaces/types/workspace';
import { GroupConversationDialog } from 'features/channels/components/GroupConversationDialog';
import { useUserDirectory, USER_DIRECTORY_QUERY_KEY } from 'features/users/hooks/useUserDirectory';
import { useConversationChannelSubscriptions } from '../hooks/useConversationChannelSubscriptions';

const MemberDirectoryRow: React.FC<{
    readonly member: WorkspaceMember;
    readonly disabled: boolean;
    readonly onStart: (userId: string) => Promise<void>;
}> = ({ member, disabled, onStart }) => {
    const livePresence = usePresence(member.id);
    const presence = livePresence ?? member.presence;
    const initialsSource = `${member.firstName?.[0] ?? ''}${member.lastName?.[0] ?? ''}`.trim();
    const initials =
        initialsSource.length > 0 ? initialsSource : member.email.charAt(0).toUpperCase();
    const fullNameSource = `${member.firstName ?? ''} ${member.lastName ?? ''}`.trim();
    const fullName = fullNameSource.length > 0 ? fullNameSource : member.email;

    return (
        <ListItemButton
            disabled={disabled}
            onClick={() => {
                if (disabled) {
                    return;
                }
                void onStart(member.id);
            }}
            sx={{ alignItems: 'flex-start', py: 1.25, px: 2 }}
        >
            <ListItemAvatar>
                <Avatar>{initials}</Avatar>
            </ListItemAvatar>
            <ListItemText
                disableTypography
                primary={
                    <Stack spacing={0.25}>
                        <Typography variant="subtitle2" fontWeight={600} noWrap>
                            {fullName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap>
                            {member.email}
                        </Typography>
                    </Stack>
                }
                secondary={
                    <Box sx={{ mt: 0.5 }}>
                        <PresenceBadge
                            status={presence?.status}
                            customStatus={presence?.customStatus}
                        />
                    </Box>
                }
            />
        </ListItemButton>
    );
};

export const ConversationsPage: React.FC = () => {
    const navigate = useAppNavigate();
    const currentUserId = useAuthStore(state => state.user?.id ?? null);
    const queryClient = useQueryClient();
    const {
        channels: directMessageChannels,
        isLoading: isDirectMessagesLoading,
        isError: isDirectMessagesError,
        invalidate: invalidateDirectMessages
    } = useDirectMessageChannels();
    const {
        members: directoryMembers,
        isLoading: isDirectoryLoading,
        isError: isDirectoryError
    } = useUserDirectory();
    const [isGroupDialogOpen, setIsGroupDialogOpen] = React.useState(false);
    const [isCreatingConversation, setIsCreatingConversation] = React.useState(false);

    const conversationChannelIds = React.useMemo(() => {
        return directMessageChannels.map(channel => channel.id);
    }, [directMessageChannels]);

    useConversationChannelSubscriptions(conversationChannelIds);

    const upsertDirectMessageChannel = React.useCallback(
        (channel: Channel) => {
            queryClient.setQueryData<Channel[]>(DIRECT_MESSAGE_CHANNELS_QUERY_KEY, existing => {
                if (!existing || existing.length === 0) {
                    return [channel];
                }

                const next = existing.slice();
                const index = next.findIndex(item => item.id === channel.id);

                if (index === -1) {
                    next.unshift(channel);
                } else {
                    next[index] = channel;
                    const [updated] = next.splice(index, 1);
                    next.unshift(updated);
                }

                next.sort((a, b) => {
                    const aTime = new Date(a.updatedAt ?? a.createdAt).getTime();
                    const bTime = new Date(b.updatedAt ?? b.createdAt).getTime();
                    return bTime - aTime;
                });

                return next;
            });
        },
        [queryClient]
    );

    const availableMembers = React.useMemo(() => {
        return directoryMembers
            .filter(member => member.id !== currentUserId)
            .sort((a, b) => {
                const aName = `${a.firstName ?? ''} ${a.lastName ?? ''}`.trim() || a.email;
                const bName = `${b.firstName ?? ''} ${b.lastName ?? ''}`.trim() || b.email;
                return aName.localeCompare(bName);
            });
    }, [currentUserId, directoryMembers]);

    const invalidateDirectory = React.useCallback(async (): Promise<void> => {
        await queryClient.invalidateQueries({ queryKey: USER_DIRECTORY_QUERY_KEY });
    }, [queryClient]);

    const oneToOneChannels = React.useMemo(
        () =>
            directMessageChannels.filter(channel => channel.type === ChannelResponseDtoTypeEnum.Dm),
        [directMessageChannels]
    );

    const groupChannels = React.useMemo(
        () =>
            directMessageChannels.filter(
                channel => channel.type === ChannelResponseDtoTypeEnum.GroupDm
            ),
        [directMessageChannels]
    );

    const handleSelectChannel = React.useCallback(
        (channel: Channel) => {
            navigate(`/app/conversations/${channel.id}`);
        },
        [navigate]
    );

    const handleStartDirectMessage = React.useCallback(
        async (userId: string) => {
            if (isCreatingConversation) {
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
                upsertDirectMessageChannel(createdChannel);
                await invalidateDirectMessages();
                navigate(`/app/conversations/${createdChannel.id}`);
            } catch (error) {
                const message =
                    error instanceof Error ? error.message : 'Failed to start direct message';
                toast.error(message);
            } finally {
                setIsCreatingConversation(false);
            }
        },
        [invalidateDirectMessages, isCreatingConversation, navigate, upsertDirectMessageChannel]
    );

    const handleCreateGroupConversation = React.useCallback(
        async ({ participantIds, name }: { participantIds: string[]; name?: string }) => {
            if (isCreatingConversation) {
                throw new Error('A conversation is already being created.');
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
                upsertDirectMessageChannel(createdChannel);
                await invalidateDirectMessages();
                setIsGroupDialogOpen(false);
                navigate(`/app/conversations/${createdChannel.id}`);
            } catch (error) {
                const message =
                    error instanceof Error ? error.message : 'Failed to create group conversation';
                toast.error(message);
                throw error instanceof Error ? error : new Error(message);
            } finally {
                setIsCreatingConversation(false);
            }
        },
        [invalidateDirectMessages, isCreatingConversation, navigate, upsertDirectMessageChannel]
    );

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Box>
                <Stack direction="row" alignItems="center" spacing={1}>
                    <ChatBubbleOutlineIcon fontSize="small" />
                    <Typography variant="overline" color="text.secondary">
                        Conversations
                    </Typography>
                </Stack>
                <Typography variant="h4" fontWeight={600} sx={{ mt: 0.5 }}>
                    Direct messages and groups
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Chat with anyone across Crewdo, share updates, and keep your collaborations in
                    sync.
                </Typography>
            </Box>

            <Stack direction={{ xs: 'column', lg: 'row' }} spacing={3} alignItems="stretch">
                <Box
                    sx={{
                        flex: 2,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 3,
                        bgcolor: 'background.paper',
                        borderRadius: 3,
                        border: theme => `1px solid ${theme.palette.divider}`,
                        p: 3,
                        minHeight: 440
                    }}
                >
                    <Box>
                        <Stack direction="row" alignItems="center" spacing={1}>
                            <ForumIcon fontSize="small" />
                            <Typography variant="h6" fontWeight={600}>
                                Direct messages
                            </Typography>
                        </Stack>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            Jump back into your 1:1 chats.
                        </Typography>
                    </Box>
                    {isDirectMessagesLoading ? (
                        <Stack alignItems="center" justifyContent="center" sx={{ flex: 1 }}>
                            <CircularProgress size={28} />
                        </Stack>
                    ) : isDirectMessagesError ? (
                        <Alert severity="error">
                            We could not load direct messages. Please try again shortly.
                        </Alert>
                    ) : oneToOneChannels.length === 0 ? (
                        <Box sx={{ py: 6, textAlign: 'center' }}>
                            <Typography variant="body2" color="text.secondary">
                                No direct messages yet. Start one from the directory.
                            </Typography>
                        </Box>
                    ) : (
                        <List disablePadding>
                            {oneToOneChannels.map(channel => (
                                <ChannelListItem
                                    key={channel.id}
                                    channel={channel}
                                    selected={false}
                                    onSelect={handleSelectChannel}
                                />
                            ))}
                        </List>
                    )}

                    <Divider />

                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Stack direction="row" alignItems="center" spacing={1}>
                            <GroupAddIcon fontSize="small" />
                            <Typography variant="h6" fontWeight={600}>
                                Group conversations
                            </Typography>
                        </Stack>
                        <Tooltip title="Create group conversation">
                            <span>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={() => setIsGroupDialogOpen(true)}
                                    disabled={availableMembers.length < 2 || isCreatingConversation}
                                    startIcon={<GroupAddIcon fontSize="small" />}
                                >
                                    New group
                                </Button>
                            </span>
                        </Tooltip>
                    </Stack>
                    {isDirectMessagesLoading ? (
                        <Stack alignItems="center" justifyContent="center" sx={{ flex: 1 }}>
                            <CircularProgress size={28} />
                        </Stack>
                    ) : isDirectMessagesError ? (
                        <Alert severity="error">
                            We could not load group conversations. Please try again shortly.
                        </Alert>
                    ) : groupChannels.length === 0 ? (
                        <Box sx={{ py: 6, textAlign: 'center' }}>
                            <Typography variant="body2" color="text.secondary">
                                No group conversations yet. Create one to start collaborating.
                            </Typography>
                        </Box>
                    ) : (
                        <List disablePadding>
                            {groupChannels.map(channel => (
                                <ChannelListItem
                                    key={channel.id}
                                    channel={channel}
                                    selected={false}
                                    onSelect={handleSelectChannel}
                                />
                            ))}
                        </List>
                    )}
                </Box>

                <Box
                    sx={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                        bgcolor: 'background.paper',
                        borderRadius: 3,
                        border: theme => `1px solid ${theme.palette.divider}`,
                        p: 3,
                        minHeight: 440
                    }}
                >
                    <Typography variant="h6" fontWeight={600}>
                        Directory
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Pick teammates to start new conversations.
                    </Typography>
                    {isDirectoryLoading ? (
                        <Stack alignItems="center" justifyContent="center" sx={{ flex: 1 }}>
                            <CircularProgress size={24} />
                        </Stack>
                    ) : isDirectoryError ? (
                        <Alert
                            severity="error"
                            action={
                                <Button
                                    color="inherit"
                                    size="small"
                                    onClick={() => {
                                        void invalidateDirectory();
                                    }}
                                >
                                    Retry
                                </Button>
                            }
                        >
                            We could not load the user directory.
                        </Alert>
                    ) : availableMembers.length === 0 ? (
                        <Box sx={{ py: 6, textAlign: 'center' }}>
                            <Typography variant="body2" color="text.secondary">
                                You do not have any teammates yet.
                            </Typography>
                        </Box>
                    ) : (
                        <List disablePadding dense>
                            {availableMembers.map(member => (
                                <Tooltip key={member.id} title="Start direct message">
                                    <span>
                                        <MemberDirectoryRow
                                            member={member}
                                            disabled={isCreatingConversation}
                                            onStart={handleStartDirectMessage}
                                        />
                                    </span>
                                </Tooltip>
                            ))}
                        </List>
                    )}
                </Box>
            </Stack>

            <GroupConversationDialog
                open={isGroupDialogOpen}
                members={directoryMembers}
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
        </Box>
    );
};
