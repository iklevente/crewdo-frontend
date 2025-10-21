import React from 'react';
import {
    Autocomplete,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    List,
    ListItem,
    ListItemAvatar,
    Avatar,
    ListItemText,
    Stack,
    TextField,
    Tooltip,
    Typography
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/EditOutlined';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import PersonAddAltIcon from '@mui/icons-material/PersonAddAlt';
import { PresenceBadge } from 'components/PresenceBadge';
import type { WorkspaceMember } from 'features/workspaces/types/workspace';
import { ChannelFormDialog, type ChannelFormValues } from './ChannelFormDialog';
import { useChannelDetails } from '../hooks/useChannelDetails';

interface ChannelManagerDialogProps {
    readonly channelId: string | null;
    readonly open: boolean;
    readonly workspaceMembers: WorkspaceMember[];
    readonly canManageChannels: boolean;
    readonly currentUserId: string | null;
    readonly onClose: () => void;
    readonly onUpdateChannel: (channelId: string, values: ChannelFormValues) => Promise<void>;
    readonly onDeleteChannel: (channelId: string) => Promise<void>;
    readonly onAddMember: (channelId: string, memberId: string) => Promise<void>;
    readonly onRemoveMember: (channelId: string, memberId: string) => Promise<void>;
    readonly isBusy?: boolean;
}

export const ChannelManagerDialog: React.FC<ChannelManagerDialogProps> = ({
    channelId,
    open,
    workspaceMembers,
    canManageChannels,
    currentUserId,
    onClose,
    onUpdateChannel,
    onDeleteChannel,
    onAddMember,
    onRemoveMember,
    isBusy
}) => {
    const { channel, isLoading, invalidate } = useChannelDetails(channelId);
    const [isDeleting, setDeleting] = React.useState(false);
    const [isEditDialogOpen, setEditDialogOpen] = React.useState(false);
    const [selectedMemberId, setSelectedMemberId] = React.useState<string | null>(null);

    const handleDelete = async (): Promise<void> => {
        if (!channelId) {
            return;
        }
        setDeleting(true);
        try {
            await onDeleteChannel(channelId);
            await invalidate();
            onClose();
        } finally {
            setDeleting(false);
        }
    };

    const handleSubmitEdit = async (values: ChannelFormValues): Promise<void> => {
        if (!channelId) {
            return;
        }
        await onUpdateChannel(channelId, values);
        await invalidate();
        setEditDialogOpen(false);
    };

    const handleAddMember = async (): Promise<void> => {
        if (!channelId) {
            return;
        }
        if (!selectedMemberId) {
            return;
        }
        await onAddMember(channelId, selectedMemberId);
        await invalidate();
        setSelectedMemberId(null);
    };

    const handleRemoveMember = async (memberId: string): Promise<void> => {
        if (!channelId) {
            return;
        }
        await onRemoveMember(channelId, memberId);
        await invalidate();
    };

    const isPublicChannel = React.useMemo(() => {
        const visibility = channel?.visibility ?? '';
        return visibility.toLowerCase() === 'public';
    }, [channel?.visibility]);

    const canManageMembers = React.useMemo(() => {
        if (!channel) {
            return false;
        }
        if (isPublicChannel) {
            return false;
        }
        if (canManageChannels) {
            return true;
        }
        return channel.creator?.id === currentUserId;
    }, [canManageChannels, channel, currentUserId, isPublicChannel]);

    const availableMembers = React.useMemo(() => {
        if (!channel) {
            return [];
        }
        const existingIds = new Set(channel.members.map(member => member.id));
        return workspaceMembers.filter(member => !existingIds.has(member.id));
    }, [channel, workspaceMembers]);

    const channelFormInitialValues: ChannelFormValues | undefined = channel
        ? {
              name: channel.name,
              description: channel.description,
              topic: channel.topic,
              visibility: channel.visibility
          }
        : undefined;

    const members = channel?.members ?? [];
    const shouldShowLoadingState = isLoading ? true : channel == null;
    const isDeleteButtonDisabled = isBusy ? true : isDeleting;
    const isAddMemberButtonDisabled = selectedMemberId ? isBusy : true;

    return (
        <>
            <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
                <DialogTitle>Manage channel</DialogTitle>
                <DialogContent dividers>
                    {shouldShowLoadingState ? (
                        <Typography variant="body2" color="text.secondary">
                            Loading channel details...
                        </Typography>
                    ) : channel ? (
                        <Stack spacing={3}>
                            <Box>
                                <Stack
                                    direction="row"
                                    justifyContent="space-between"
                                    alignItems="center"
                                >
                                    <Box>
                                        <Typography variant="h6" fontWeight={600}>
                                            {channel.name}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {channel.description ?? 'No description provided'}
                                        </Typography>
                                    </Box>
                                    <Stack direction="row" spacing={1}>
                                        <Button
                                            variant="outlined"
                                            startIcon={<EditIcon />}
                                            onClick={() => setEditDialogOpen(true)}
                                            disabled={isBusy}
                                        >
                                            Edit details
                                        </Button>
                                        <Button
                                            color="error"
                                            variant="outlined"
                                            startIcon={<DeleteIcon />}
                                            onClick={() => {
                                                void handleDelete();
                                            }}
                                            disabled={isDeleteButtonDisabled}
                                        >
                                            Delete
                                        </Button>
                                    </Stack>
                                </Stack>
                                <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                                    <Typography variant="caption" color="text.secondary">
                                        Type: {channel.type}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Visibility: {channel.visibility}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Members: {channel.members.length}
                                    </Typography>
                                </Stack>
                            </Box>

                            <Box>
                                <Stack
                                    direction={{ xs: 'column', md: 'row' }}
                                    spacing={2}
                                    alignItems={{ md: 'center' }}
                                >
                                    <Typography variant="subtitle1" fontWeight={600}>
                                        Channel members
                                    </Typography>
                                    {canManageMembers ? (
                                        <Stack
                                            direction={{ xs: 'column', md: 'row' }}
                                            spacing={1}
                                            flex={1}
                                        >
                                            <Autocomplete
                                                disablePortal
                                                options={availableMembers}
                                                value={
                                                    availableMembers.find(
                                                        member => member.id === selectedMemberId
                                                    ) ?? null
                                                }
                                                onChange={(_, value) => {
                                                    setSelectedMemberId(value?.id ?? null);
                                                }}
                                                getOptionLabel={option => {
                                                    const fullName =
                                                        `${option.firstName ?? ''} ${option.lastName ?? ''}`.trim();
                                                    return fullName.length > 0
                                                        ? fullName
                                                        : option.email;
                                                }}
                                                renderInput={params => (
                                                    <TextField
                                                        {...params}
                                                        label="Add member"
                                                        placeholder="Search workspace members"
                                                    />
                                                )}
                                            />
                                            <Button
                                                variant="contained"
                                                startIcon={<PersonAddAltIcon />}
                                                onClick={() => {
                                                    void handleAddMember();
                                                }}
                                                disabled={isAddMemberButtonDisabled}
                                            >
                                                Add
                                            </Button>
                                        </Stack>
                                    ) : isPublicChannel ? (
                                        <Typography variant="body2" color="text.secondary">
                                            This channel is public. Workspace members can join
                                            without an invitation.
                                        </Typography>
                                    ) : null}
                                </Stack>

                                <List sx={{ mt: 2 }} dense>
                                    {members.map(member => {
                                        const initialsSource =
                                            `${member.firstName?.[0] ?? ''}${member.lastName?.[0] ?? ''}`.trim();
                                        const initials =
                                            initialsSource.length > 0
                                                ? initialsSource
                                                : member.email.charAt(0).toUpperCase();
                                        const fullNameSource =
                                            `${member.firstName ?? ''} ${member.lastName ?? ''}`.trim();
                                        const fullName =
                                            fullNameSource.length > 0
                                                ? fullNameSource
                                                : member.email;
                                        const { presence } = member;

                                        return (
                                            <ListItem
                                                key={member.id}
                                                secondaryAction={
                                                    canManageMembers ? (
                                                        <Tooltip title="Remove from channel">
                                                            <span>
                                                                <IconButton
                                                                    edge="end"
                                                                    disabled={isBusy}
                                                                    onClick={() => {
                                                                        void handleRemoveMember(
                                                                            member.id
                                                                        );
                                                                    }}
                                                                >
                                                                    <RemoveCircleOutlineIcon fontSize="small" />
                                                                </IconButton>
                                                            </span>
                                                        </Tooltip>
                                                    ) : undefined
                                                }
                                            >
                                                <ListItemAvatar>
                                                    <Avatar>{initials}</Avatar>
                                                </ListItemAvatar>
                                                <ListItemText
                                                    primary={
                                                        <Stack spacing={0.5}>
                                                            <Typography
                                                                variant="subtitle2"
                                                                fontWeight={600}
                                                            >
                                                                {fullName}
                                                            </Typography>
                                                            <Typography
                                                                variant="caption"
                                                                color="text.secondary"
                                                            >
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
                                            </ListItem>
                                        );
                                    })}
                                </List>
                            </Box>
                        </Stack>
                    ) : null}
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose}>Close</Button>
                </DialogActions>
            </Dialog>

            <ChannelFormDialog
                open={isEditDialogOpen}
                title="Edit channel"
                submitLabel="Save changes"
                onClose={() => setEditDialogOpen(false)}
                onSubmit={async values => {
                    await handleSubmitEdit(values);
                }}
                initialValues={channelFormInitialValues}
                isSubmitting={isBusy}
            />
        </>
    );
};
