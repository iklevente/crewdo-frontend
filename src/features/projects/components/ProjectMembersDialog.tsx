import React from 'react';
import {
    Alert,
    Avatar,
    Button,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    InputLabel,
    List,
    ListItem,
    ListItemAvatar,
    ListItemSecondaryAction,
    ListItemText,
    MenuItem,
    OutlinedInput,
    Select,
    Stack,
    Tooltip,
    Typography
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/PersonRemoveAlt1';
import type { ProjectMember } from '../types/project';

interface ProjectMembersDialogProps {
    readonly open: boolean;
    readonly projectName: string;
    readonly ownerId: string | null;
    readonly members: ProjectMember[];
    readonly availableMembers: ProjectMember[];
    readonly canManageMembers: boolean;
    readonly isSubmitting?: boolean;
    readonly onClose: () => void;
    readonly onAddMembers: (memberIds: string[]) => Promise<void>;
    readonly onRemoveMember: (memberId: string) => Promise<void>;
}

const buildDisplayName = (member: ProjectMember): string => {
    const fullName = `${member.firstName ?? ''} ${member.lastName ?? ''}`.trim();
    if (fullName.length > 0) {
        return fullName;
    }
    return member.email ?? 'Unknown member';
};

const getInitials = (member: ProjectMember): string => {
    const initials = `${member.firstName?.[0] ?? ''}${member.lastName?.[0] ?? ''}`.trim();
    if (initials.length > 0) {
        return initials.toUpperCase();
    }
    return member.email?.charAt(0)?.toUpperCase() ?? '?';
};

export const ProjectMembersDialog: React.FC<ProjectMembersDialogProps> = ({
    open,
    projectName,
    ownerId,
    members,
    availableMembers,
    canManageMembers,
    isSubmitting,
    onClose,
    onAddMembers,
    onRemoveMember
}) => {
    const [selectedMembers, setSelectedMembers] = React.useState<string[]>([]);

    React.useEffect(() => {
        if (!open) {
            setSelectedMembers([]);
        }
    }, [open]);

    const handleAddMembers = async (): Promise<void> => {
        if (selectedMembers.length === 0) {
            return;
        }
        await onAddMembers(selectedMembers);
        setSelectedMembers([]);
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>Manage members for {projectName}</DialogTitle>
            <DialogContent>
                <Stack spacing={3} sx={{ mt: 1 }}>
                    <div>
                        <Typography variant="subtitle2" gutterBottom>
                            Current members
                        </Typography>
                        <List dense disablePadding>
                            {members.map(member => {
                                const label = buildDisplayName(member);
                                const isOwner = member.id === ownerId;
                                return (
                                    <ListItem key={member.id} sx={{ py: 1 }}>
                                        <ListItemAvatar>
                                            <Avatar>{getInitials(member)}</Avatar>
                                        </ListItemAvatar>
                                        <ListItemText
                                            primary={label}
                                            secondary={member.email}
                                            primaryTypographyProps={{
                                                fontWeight: isOwner ? 600 : 500
                                            }}
                                        />
                                        {canManageMembers && !isOwner ? (
                                            <ListItemSecondaryAction>
                                                <Tooltip title="Remove from project">
                                                    <span>
                                                        <Button
                                                            color="error"
                                                            size="small"
                                                            startIcon={
                                                                <DeleteIcon fontSize="small" />
                                                            }
                                                            disabled={isSubmitting}
                                                            onClick={() => {
                                                                void onRemoveMember(member.id);
                                                            }}
                                                        >
                                                            Remove
                                                        </Button>
                                                    </span>
                                                </Tooltip>
                                            </ListItemSecondaryAction>
                                        ) : null}
                                    </ListItem>
                                );
                            })}
                            {members.length === 0 ? (
                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    sx={{ px: 2, py: 1 }}
                                >
                                    No members added yet.
                                </Typography>
                            ) : null}
                        </List>
                    </div>

                    {canManageMembers ? (
                        <Stack spacing={1.5}>
                            <FormControl fullWidth>
                                <InputLabel id="project-member-select-label">
                                    Add members
                                </InputLabel>
                                <Select
                                    labelId="project-member-select-label"
                                    multiple
                                    value={selectedMembers}
                                    onChange={event => {
                                        const { value } = event.target;
                                        setSelectedMembers(
                                            typeof value === 'string' ? value.split(',') : value
                                        );
                                    }}
                                    input={<OutlinedInput label="Add members" />}
                                    renderValue={selected =>
                                        selected
                                            .map(memberId =>
                                                buildDisplayName(
                                                    availableMembers.find(
                                                        option => option.id === memberId
                                                    ) ?? {
                                                        id: memberId,
                                                        email: 'Unknown member'
                                                    }
                                                )
                                            )
                                            .join(', ')
                                    }
                                >
                                    {availableMembers.map(member => (
                                        <MenuItem key={member.id} value={member.id}>
                                            <Checkbox
                                                checked={selectedMembers.includes(member.id)}
                                            />
                                            <ListItemText
                                                primary={buildDisplayName(member)}
                                                secondary={member.email}
                                            />
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            {availableMembers.length === 0 ? (
                                <Alert severity="info">
                                    No additional members available to add. Invite teammates to the
                                    project workspace first.
                                </Alert>
                            ) : null}
                        </Stack>
                    ) : (
                        <Alert severity="info">
                            You do not have permission to manage project members. Contact the
                            project owner for changes.
                        </Alert>
                    )}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Close</Button>
                {canManageMembers ? (
                    <Button
                        variant="contained"
                        onClick={() => {
                            void handleAddMembers();
                        }}
                        disabled={[
                            isSubmitting,
                            selectedMembers.length === 0,
                            availableMembers?.length === 0
                        ].some(Boolean)}
                    >
                        Add selected
                    </Button>
                ) : null}
            </DialogActions>
        </Dialog>
    );
};
