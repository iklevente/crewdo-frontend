import React from 'react';
import {
    Autocomplete,
    Avatar,
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    TextField,
    Typography
} from '@mui/material';
import GroupAddIcon from '@mui/icons-material/GroupAddOutlined';
import type { WorkspaceMember } from 'features/workspaces/types/workspace';
import { PresenceBadge } from 'components/PresenceBadge';

interface GroupConversationDialogProps {
    readonly open: boolean;
    readonly members: WorkspaceMember[];
    readonly currentUserId: string | null;
    readonly isSubmitting: boolean;
    readonly onClose: () => void;
    onCreate: (payload: { participantIds: string[]; name?: string }) => Promise<void>;
}

export const GroupConversationDialog: React.FC<GroupConversationDialogProps> = ({
    open,
    members,
    currentUserId,
    isSubmitting,
    onClose,
    onCreate
}) => {
    const [selectedParticipants, setSelectedParticipants] = React.useState<WorkspaceMember[]>([]);
    const [groupName, setGroupName] = React.useState('');
    const [error, setError] = React.useState<string | null>(null);

    const availableMembers = React.useMemo(() => {
        return members.filter(member => member.id !== currentUserId);
    }, [members, currentUserId]);

    const resetState = React.useCallback(() => {
        setSelectedParticipants([]);
        setGroupName('');
        setError(null);
    }, []);

    React.useEffect(() => {
        if (!open) {
            resetState();
        }
    }, [open, resetState]);

    const handleCreate = async (): Promise<void> => {
        if (selectedParticipants.length < 2) {
            setError('Pick at least two teammates to start a group conversation.');
            return;
        }

        const participantIds = selectedParticipants.map(member => member.id);
        const trimmedName = groupName.trim();

        try {
            await onCreate({
                participantIds,
                name: trimmedName.length > 0 ? trimmedName : undefined
            });
            resetState();
        } catch (creationError) {
            const message =
                creationError instanceof Error
                    ? creationError.message
                    : 'Failed to start the group conversation';
            setError(message);
        }
    };

    const displayName = (member: WorkspaceMember): string => {
        const fullName = `${member.firstName ?? ''} ${member.lastName ?? ''}`.trim();
        return fullName.length > 0 ? fullName : member.email;
    };

    const initialsFor = (member: WorkspaceMember): string => {
        const fullName = `${member.firstName ?? ''} ${member.lastName ?? ''}`.trim();
        if (fullName.length > 0) {
            return fullName
                .split(' ')
                .map(part => part.charAt(0).toUpperCase())
                .join('')
                .slice(0, 2);
        }
        return member.email.charAt(0).toUpperCase();
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Start a group conversation</DialogTitle>
            <DialogContent dividers>
                <Stack spacing={3}>
                    <Box>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                            Participants
                        </Typography>
                        <Autocomplete
                            multiple
                            disableCloseOnSelect
                            options={availableMembers}
                            value={selectedParticipants}
                            onChange={(_event, value) => {
                                setSelectedParticipants(value);
                                setError(null);
                            }}
                            getOptionLabel={displayName}
                            isOptionEqualToValue={(option, value) => option.id === value.id}
                            renderOption={(props, option) => (
                                <li {...props} key={option.id}>
                                    <Stack direction="row" spacing={1.5} alignItems="center">
                                        <Avatar sx={{ width: 32, height: 32 }}>
                                            {initialsFor(option)}
                                        </Avatar>
                                        <Box>
                                            <Typography variant="body2" fontWeight={600}>
                                                {displayName(option)}
                                            </Typography>
                                            <PresenceBadge
                                                status={option.presence?.status}
                                                customStatus={option.presence?.customStatus}
                                            />
                                        </Box>
                                    </Stack>
                                </li>
                            )}
                            renderTags={(value, getTagProps) =>
                                value.map((option, index) => (
                                    <Chip
                                        {...getTagProps({ index })}
                                        key={option.id}
                                        label={displayName(option)}
                                    />
                                ))
                            }
                            renderInput={params => (
                                <TextField
                                    {...params}
                                    placeholder="Select teammates"
                                    helperText={error}
                                    error={Boolean(error)}
                                />
                            )}
                            ListboxProps={{ style: { maxHeight: 260 } }}
                        />
                    </Box>

                    <Box>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                            Name (optional)
                        </Typography>
                        <TextField
                            fullWidth
                            value={groupName}
                            onChange={event => setGroupName(event.target.value)}
                            placeholder="Project sync, design squad, …"
                            inputProps={{ maxLength: 120 }}
                        />
                    </Box>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={isSubmitting}>
                    Cancel
                </Button>
                <Button
                    onClick={() => {
                        void handleCreate();
                    }}
                    variant="contained"
                    startIcon={<GroupAddIcon fontSize="small" />}
                    disabled={isSubmitting || selectedParticipants.length === 0}
                >
                    Start group
                </Button>
            </DialogActions>
        </Dialog>
    );
};
