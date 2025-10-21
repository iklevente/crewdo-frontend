import React from 'react';
import {
    Avatar,
    Box,
    Button,
    Chip,
    Divider,
    List,
    ListItemAvatar,
    ListItemButton,
    ListItemText,
    Skeleton,
    Stack,
    Tooltip,
    Typography
} from '@mui/material';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import PeopleAltIcon from '@mui/icons-material/PeopleAltOutlined';
import ForumIcon from '@mui/icons-material/ForumOutlined';
import GroupAddIcon from '@mui/icons-material/GroupAddOutlined';
import LockIcon from '@mui/icons-material/LockOutlined';
import PublicIcon from '@mui/icons-material/Public';
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';
import { PresenceBadge } from 'components/PresenceBadge';
import { usePresence } from 'store/presence-store';
import type { WorkspaceMember } from 'features/workspaces/types/workspace';
import type { Channel } from '../types/channel';

interface ChannelSidebarProps {
    readonly channels: Channel[];
    readonly directMessages: Channel[];
    readonly groupChannels: Channel[];
    readonly members: WorkspaceMember[];
    readonly currentUserId: string | null;
    readonly activeChannelId: string | null;
    readonly isLoading: boolean;
    readonly isDmLoading: boolean;
    readonly isMembersLoading: boolean;
    readonly isCreatingDm?: boolean;
    readonly onSelectChannel: (channelId: string) => void;
    readonly onStartDirectMessage: (userId: string) => Promise<void>;
    readonly onOpenGroupDialog: () => void;
}

const renderSkeletonList = (rows: number): React.ReactElement => (
    <Stack spacing={2} sx={{ p: 2 }}>
        {Array.from({ length: rows }).map((_, index) => (
            <Skeleton key={index} height={36} variant="rounded" />
        ))}
    </Stack>
);

const ChannelRow: React.FC<{
    readonly channel: Channel;
    readonly selected: boolean;
    readonly onSelect: (channelId: string) => void;
    readonly showVisibility?: boolean;
}> = ({ channel, selected, onSelect, showVisibility = false }) => {
    const { lastMessage } = channel;
    const lastMessagePreview = lastMessage?.content ?? 'No messages yet';
    const authorName = lastMessage
        ? `${lastMessage.author.firstName ?? ''} ${lastMessage.author.lastName ?? ''}`.trim() ||
          'Someone'
        : null;
    const relativeTime = lastMessage
        ? formatDistanceToNow(new Date(lastMessage.createdAt), { addSuffix: true })
        : null;

    return (
        <ListItemButton
            onClick={() => onSelect(channel.id)}
            selected={selected}
            sx={{ alignItems: 'flex-start', py: 1.5, px: 2 }}
        >
            <ListItemText
                primary={
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
                        <Typography variant="subtitle2" fontWeight={600} noWrap>
                            {channel.name}
                        </Typography>
                        {showVisibility ? (
                            <Chip
                                icon={
                                    channel.visibility === 'private' ? (
                                        <LockIcon fontSize="inherit" />
                                    ) : (
                                        <PublicIcon fontSize="inherit" color="success" />
                                    )
                                }
                                label={channel.visibility === 'private' ? 'Private' : 'Public'}
                                size="small"
                            />
                        ) : null}
                        {typeof channel.unreadCount === 'number' && channel.unreadCount > 0 ? (
                            <Chip
                                label={`${channel.unreadCount} unread`}
                                size="small"
                                color="primary"
                            />
                        ) : null}
                    </Stack>
                }
                secondary={
                    <Stack spacing={0.5} sx={{ mt: 0.75, minWidth: 0 }}>
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                                display: '-webkit-box',
                                WebkitLineClamp: 1,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden'
                            }}
                        >
                            {lastMessagePreview}
                        </Typography>
                        {authorName && relativeTime ? (
                            <Typography variant="caption" color="text.secondary">
                                {authorName} • {relativeTime}
                            </Typography>
                        ) : null}
                    </Stack>
                }
            />
        </ListItemButton>
    );
};

const MemberDmRow: React.FC<{
    readonly member: WorkspaceMember;
    readonly onStart: (userId: string) => Promise<void>;
    readonly disabled: boolean;
}> = ({ member, onStart, disabled }) => {
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
                    <PresenceBadge
                        status={presence?.status}
                        customStatus={presence?.customStatus}
                    />
                }
            />
        </ListItemButton>
    );
};

export const ChannelSidebar: React.FC<ChannelSidebarProps> = ({
    channels,
    directMessages,
    groupChannels,
    members,
    currentUserId,
    activeChannelId,
    isLoading,
    isDmLoading,
    isMembersLoading,
    isCreatingDm,
    onSelectChannel,
    onStartDirectMessage,
    onOpenGroupDialog
}) => {
    const sortedWorkspaceChannels = React.useMemo(
        () => [...channels].sort((a, b) => a.name.localeCompare(b.name)),
        [channels]
    );

    const sortedDirectMessages = React.useMemo(
        () => [...directMessages].sort((a, b) => a.name.localeCompare(b.name)),
        [directMessages]
    );

    const sortedGroupChannels = React.useMemo(
        () => [...groupChannels].sort((a, b) => a.name.localeCompare(b.name)),
        [groupChannels]
    );

    const availableMembers = React.useMemo(() => {
        const filtered = members.filter(member => member.id !== currentUserId);
        return filtered.sort((a, b) => {
            const aName = `${a.firstName ?? ''} ${a.lastName ?? ''}`.trim() || a.email;
            const bName = `${b.firstName ?? ''} ${b.lastName ?? ''}`.trim() || b.email;
            return aName.localeCompare(bName);
        });
    }, [members, currentUserId]);

    const isSidebarLoading = isLoading && sortedWorkspaceChannels.length === 0;

    return (
        <Box
            sx={{
                width: 320,
                borderRight: theme => `1px solid ${theme.palette.divider}`,
                height: '100%',
                display: 'flex',
                flexDirection: 'column'
            }}
        >
            <Box sx={{ p: 2 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                    <ChatBubbleOutlineIcon fontSize="small" />
                    <Typography variant="subtitle1" fontWeight={600}>
                        Channels
                    </Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Browse channels in this workspace.
                </Typography>
            </Box>
            <Divider />

            {isSidebarLoading ? (
                renderSkeletonList(4)
            ) : (
                <List disablePadding>
                    {sortedWorkspaceChannels.map(channel => (
                        <ChannelRow
                            key={channel.id}
                            channel={channel}
                            selected={channel.id === activeChannelId}
                            onSelect={onSelectChannel}
                            showVisibility
                        />
                    ))}
                    {sortedWorkspaceChannels.length === 0 ? (
                        <Box sx={{ px: 2, py: 3 }}>
                            <Typography variant="body2" color="text.secondary">
                                No channels yet. Create one from the workspace settings.
                            </Typography>
                        </Box>
                    ) : null}
                </List>
            )}

            <Divider sx={{ my: 2 }} />

            <Box sx={{ px: 2 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                    <PeopleAltIcon fontSize="small" />
                    <Typography variant="subtitle1" fontWeight={600}>
                        Team directory
                    </Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Start a private conversation by selecting a teammate.
                </Typography>
            </Box>

            {isMembersLoading ? (
                renderSkeletonList(4)
            ) : (
                <List disablePadding dense>
                    {availableMembers.map(member => (
                        <Tooltip key={member.id} title="Start direct message">
                            <span>
                                <MemberDmRow
                                    member={member}
                                    onStart={onStartDirectMessage}
                                    disabled={Boolean(isCreatingDm)}
                                />
                            </span>
                        </Tooltip>
                    ))}
                    {availableMembers.length === 0 ? (
                        <Box sx={{ px: 2, py: 3 }}>
                            <Typography variant="body2" color="text.secondary">
                                You are the only member of this workspace.
                            </Typography>
                        </Box>
                    ) : null}
                </List>
            )}

            <Divider sx={{ my: 2 }} />

            <Box sx={{ px: 2 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                    <ForumIcon fontSize="small" />
                    <Typography variant="subtitle1" fontWeight={600}>
                        Direct messages
                    </Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Continue where you left off with 1:1 chats.
                </Typography>
            </Box>

            {isDmLoading ? (
                renderSkeletonList(3)
            ) : (
                <List disablePadding>
                    {sortedDirectMessages.map(channel => (
                        <ChannelRow
                            key={channel.id}
                            channel={channel}
                            selected={channel.id === activeChannelId}
                            onSelect={onSelectChannel}
                        />
                    ))}
                    {sortedDirectMessages.length === 0 ? (
                        <Box sx={{ px: 2, py: 3 }}>
                            <Typography variant="body2" color="text.secondary">
                                No direct messages yet. Start one from the team directory.
                            </Typography>
                        </Box>
                    ) : null}
                </List>
            )}

            <Divider sx={{ my: 2 }} />

            <Box sx={{ px: 2 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <GroupAddIcon fontSize="small" />
                        <Typography variant="subtitle1" fontWeight={600}>
                            Group conversations
                        </Typography>
                    </Stack>
                    <Tooltip title="Create group conversation">
                        <span>
                            <Button
                                size="small"
                                variant="outlined"
                                onClick={onOpenGroupDialog}
                                disabled={Boolean(isCreatingDm)}
                                startIcon={<GroupAddIcon fontSize="small" />}
                            >
                                New group
                            </Button>
                        </span>
                    </Tooltip>
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Collaborate with multiple teammates at once.
                </Typography>
            </Box>

            <List disablePadding>
                {sortedGroupChannels.map(channel => (
                    <ChannelRow
                        key={channel.id}
                        channel={channel}
                        selected={channel.id === activeChannelId}
                        onSelect={onSelectChannel}
                    />
                ))}
                {sortedGroupChannels.length === 0 ? (
                    <Box sx={{ px: 2, py: 3 }}>
                        <Typography variant="body2" color="text.secondary">
                            No group conversations yet. Create one to start collaborating.
                        </Typography>
                    </Box>
                ) : null}
            </List>
        </Box>
    );
};
