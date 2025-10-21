import React from 'react';
import {
    Box,
    Button,
    Chip,
    IconButton,
    List,
    ListItem,
    ListItemSecondaryAction,
    ListItemText,
    Skeleton,
    Stack,
    Tooltip,
    Typography
} from '@mui/material';
import EditIcon from '@mui/icons-material/EditOutlined';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import ForumIcon from '@mui/icons-material/ForumOutlined';
import SettingsIcon from '@mui/icons-material/SettingsOutlined';
import LaunchIcon from '@mui/icons-material/Launch';
import LockIcon from '@mui/icons-material/LockOutlined';
import PublicIcon from '@mui/icons-material/Public';
import type { Workspace, WorkspaceChannelSummary } from '../types/workspace';

interface WorkspaceOverviewProps {
    readonly workspace: Workspace | null;
    readonly channels: WorkspaceChannelSummary[];
    readonly isWorkspaceLoading: boolean;
    readonly isChannelsLoading: boolean;
    readonly canEditWorkspace: boolean;
    readonly canManageChannels: boolean;
    readonly onEditWorkspace: () => void;
    readonly onDeleteWorkspace: () => void;
    readonly onCreateChannel: () => void;
    readonly onManageChannel: (channelId: string) => void;
    readonly onOpenChannel: (channelId: string) => void;
    readonly isBusy?: boolean;
}

const resolveVisibilityChip = (visibility?: string): React.ReactElement => {
    if ((visibility ?? '').toLowerCase() === 'private') {
        return <Chip icon={<LockIcon fontSize="small" />} size="small" label="Private" />;
    }
    return (
        <Chip icon={<PublicIcon fontSize="small" />} size="small" label="Public" color="success" />
    );
};

const formatWorkspaceType = (type?: string): string => {
    if (!type) {
        return 'Team';
    }
    const normalized = type.toLowerCase();
    switch (normalized) {
        case 'company':
            return 'Company';
        case 'team':
            return 'Team';
        case 'project':
            return 'Project';
        case 'community':
            return 'Community';
        default:
            return normalized.charAt(0).toUpperCase() + normalized.slice(1);
    }
};

export const WorkspaceOverview: React.FC<WorkspaceOverviewProps> = ({
    workspace,
    channels,
    isWorkspaceLoading,
    isChannelsLoading,
    canEditWorkspace,
    canManageChannels,
    onEditWorkspace,
    onDeleteWorkspace,
    onCreateChannel,
    onManageChannel,
    onOpenChannel,
    isBusy
}) => {
    if (!workspace && !isWorkspaceLoading) {
        return (
            <Box
                sx={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '60vh'
                }}
            >
                <Stack spacing={1.5} alignItems="center">
                    <ForumIcon color="disabled" sx={{ fontSize: 48 }} />
                    <Typography variant="h6" color="text.secondary">
                        Select a workspace to get started
                    </Typography>
                    <Typography variant="body2" color="text.secondary" align="center">
                        Use the switcher on the left to browse workspaces or create a new one.
                    </Typography>
                </Stack>
            </Box>
        );
    }

    return (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box
                sx={{
                    borderRadius: 3,
                    border: theme => `1px solid ${theme.palette.divider}`,
                    p: 3,
                    backgroundColor: theme => theme.palette.background.paper
                }}
            >
                {isWorkspaceLoading || !workspace ? (
                    <Stack spacing={2}>
                        <Skeleton variant="text" height={40} width="60%" />
                        <Skeleton variant="text" height={24} width="80%" />
                        <Skeleton variant="rectangular" height={72} />
                    </Stack>
                ) : (
                    <Stack
                        spacing={2}
                        sx={{
                            alignItems: { xs: 'flex-start', md: 'flex-start' }
                        }}
                    >
                        <Stack
                            direction={{ xs: 'column', md: 'row' }}
                            spacing={2}
                            alignItems={{ md: 'center' }}
                        >
                            <Typography variant="h4" fontWeight={700}>
                                {workspace.name}
                            </Typography>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <Chip
                                    label={`${formatWorkspaceType(workspace.type)} workspace`}
                                    size="small"
                                    color="primary"
                                />
                                <Chip
                                    label={`${workspace.memberCount ?? 0} members`}
                                    size="small"
                                />
                                <Chip
                                    label={`${workspace.channelCount ?? channels.length} channels`}
                                    size="small"
                                />
                            </Stack>
                        </Stack>
                        <Typography variant="body1" color="text.secondary">
                            {workspace.description ?? 'No description provided yet.'}
                        </Typography>
                        <Stack direction="row" spacing={2} alignItems="center">
                            <Typography variant="body2" color="text.secondary">
                                Owner:
                            </Typography>
                            <Typography variant="subtitle2" fontWeight={600}>
                                {`${workspace.owner.firstName ?? ''} ${workspace.owner.lastName ?? ''}`.trim() ||
                                    workspace.owner.email}
                            </Typography>
                        </Stack>
                        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                            {canEditWorkspace ? (
                                <Button
                                    variant="contained"
                                    startIcon={<EditIcon />}
                                    onClick={onEditWorkspace}
                                    disabled={isBusy}
                                >
                                    Edit workspace
                                </Button>
                            ) : null}
                            {canEditWorkspace ? (
                                <Button
                                    color="error"
                                    variant="outlined"
                                    startIcon={<DeleteIcon />}
                                    onClick={onDeleteWorkspace}
                                    disabled={isBusy}
                                >
                                    Delete
                                </Button>
                            ) : null}
                            {canManageChannels ? (
                                <Button
                                    variant="outlined"
                                    startIcon={<ForumIcon />}
                                    onClick={onCreateChannel}
                                    disabled={isBusy}
                                >
                                    New channel
                                </Button>
                            ) : null}
                        </Stack>
                    </Stack>
                )}
            </Box>

            <Box
                sx={{
                    borderRadius: 3,
                    border: theme => `1px solid ${theme.palette.divider}`,
                    backgroundColor: theme => theme.palette.background.paper,
                    p: 2,
                    display: 'flex',
                    flexDirection: 'column'
                }}
            >
                <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{ mb: 1 }}
                >
                    <Typography variant="h6" fontWeight={600}>
                        Channels
                    </Typography>
                    {canManageChannels ? (
                        <Button
                            size="small"
                            variant="text"
                            onClick={onCreateChannel}
                            disabled={isBusy}
                        >
                            Create channel
                        </Button>
                    ) : null}
                </Stack>

                {isChannelsLoading ? (
                    <Stack spacing={1.5} sx={{ py: 2 }}>
                        {Array.from({ length: 4 }).map((_, index) => (
                            <Skeleton key={index} variant="rectangular" height={56} />
                        ))}
                    </Stack>
                ) : channels.length > 0 ? (
                    <List>
                        {channels.map(channel => {
                            const typeLabel = channel.type
                                ? channel.type.charAt(0).toUpperCase() + channel.type.slice(1)
                                : 'Text';
                            const lastMessagePreview =
                                channel.lastMessage?.content ?? 'No messages yet';
                            const lastMessageAuthor = channel.lastMessage
                                ? `${channel.lastMessage.author.firstName ?? ''} ${channel.lastMessage.author.lastName ?? ''}`.trim() ||
                                  'Someone'
                                : null;

                            return (
                                <ListItem key={channel.id} alignItems="flex-start">
                                    <ListItemText
                                        primary={
                                            <Stack direction="row" spacing={1} alignItems="center">
                                                <Typography variant="subtitle1" fontWeight={600}>
                                                    {channel.name}
                                                </Typography>
                                                <Chip
                                                    size="small"
                                                    variant="outlined"
                                                    label={typeLabel}
                                                />
                                                {resolveVisibilityChip(channel.visibility)}
                                                {typeof channel.unreadCount === 'number' &&
                                                channel.unreadCount > 0 ? (
                                                    <Chip
                                                        size="small"
                                                        color="primary"
                                                        label={`${channel.unreadCount} unread`}
                                                    />
                                                ) : null}
                                            </Stack>
                                        }
                                        secondary={
                                            <Typography
                                                variant="body2"
                                                color="text.secondary"
                                                sx={{ mt: 0.5 }}
                                            >
                                                {lastMessageAuthor ? `${lastMessageAuthor}: ` : ''}
                                                {lastMessagePreview}
                                            </Typography>
                                        }
                                    />
                                    <ListItemSecondaryAction>
                                        <Tooltip title="Open channel">
                                            <IconButton
                                                edge="end"
                                                onClick={() => onOpenChannel(channel.id)}
                                            >
                                                <LaunchIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        {canManageChannels ? (
                                            <Tooltip title="Manage channel">
                                                <IconButton
                                                    edge="end"
                                                    onClick={() => onManageChannel(channel.id)}
                                                    sx={{ ml: 1 }}
                                                    disabled={isBusy}
                                                >
                                                    <SettingsIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        ) : null}
                                    </ListItemSecondaryAction>
                                </ListItem>
                            );
                        })}
                    </List>
                ) : (
                    <Stack spacing={1} sx={{ py: 4 }} alignItems="center">
                        <Typography variant="body1" fontWeight={600}>
                            No channels yet
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {canManageChannels
                                ? 'Create a channel to start conversations in this workspace.'
                                : 'Workspace managers can create the first channel.'}
                        </Typography>
                    </Stack>
                )}
            </Box>
        </Box>
    );
};
