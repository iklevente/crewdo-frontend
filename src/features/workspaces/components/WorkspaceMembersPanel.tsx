import React from 'react';
import {
    Avatar,
    Box,
    Button,
    IconButton,
    InputAdornment,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    Stack,
    TextField,
    Tooltip,
    Typography
} from '@mui/material';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { PresenceBadge } from 'components/PresenceBadge';
import { UserProfileDialog } from 'features/users/components/UserProfileDialog';
import { usePresence } from 'store/presence-store';
import type { WorkspaceMember } from '../types/workspace';

interface MemberRowProps {
    readonly member: WorkspaceMember;
    readonly isOwner: boolean;
    readonly onRemove?: (userId: string) => void;
    readonly onSelect?: (userId: string) => void;
    readonly disableRemove: boolean;
}

const WorkspaceMemberRow: React.FC<MemberRowProps> = ({
    member,
    isOwner,
    onRemove,
    onSelect,
    disableRemove
}) => {
    const livePresence = usePresence(member.id);
    const presence = livePresence ?? member.presence;

    const initialsSource = `${member.firstName?.[0] ?? ''}${member.lastName?.[0] ?? ''}`.trim();
    const initials =
        initialsSource.length > 0 ? initialsSource : member.email.charAt(0).toUpperCase();
    const fullNameSource = `${member.firstName ?? ''} ${member.lastName ?? ''}`.trim();
    const fullName = fullNameSource.length > 0 ? fullNameSource : member.email;

    return (
        <ListItem
            key={member.id}
            secondaryAction={
                onRemove && !isOwner ? (
                    <Tooltip title="Remove from workspace">
                        <span>
                            <IconButton
                                edge="end"
                                disabled={disableRemove}
                                onClick={() => {
                                    void onRemove(member.id);
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
                <Tooltip title="View profile">
                    <span>
                        <IconButton
                            size="small"
                            onClick={() => onSelect?.(member.id)}
                            sx={{ p: 0 }}
                        >
                            <Avatar sx={{ width: 40, height: 40 }}>{initials}</Avatar>
                        </IconButton>
                    </span>
                </Tooltip>
            </ListItemAvatar>
            <ListItemText
                primary={
                    <Stack spacing={0.5}>
                        <Typography variant="subtitle2" fontWeight={600}>
                            {fullName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {isOwner ? 'Owner' : member.email}
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
};

interface WorkspaceMembersPanelProps {
    readonly members: WorkspaceMember[];
    readonly owner: WorkspaceMember | null;
    readonly canInviteMembers: boolean;
    readonly canRemoveMembers: boolean;
    readonly onInviteMember?: (email: string) => Promise<void>;
    readonly onRemoveMember?: (userId: string) => Promise<void>;
    readonly isBusy?: boolean;
}

export const WorkspaceMembersPanel: React.FC<WorkspaceMembersPanelProps> = ({
    members,
    owner,
    canInviteMembers,
    canRemoveMembers,
    onInviteMember,
    onRemoveMember,
    isBusy
}) => {
    const [email, setEmail] = React.useState('');
    const [isSubmitting, setSubmitting] = React.useState(false);
    const trimmedEmail = email.trim();
    const hasEmailValue = trimmedEmail.length > 0;
    const isBusyFlag = Boolean(isBusy);
    const isInviteDisabled = hasEmailValue ? (isSubmitting ? true : isBusyFlag) : true;
    const isRemoveDisabled = isBusyFlag ? true : isSubmitting;
    const [selectedMemberId, setSelectedMemberId] = React.useState<string | null>(null);
    const selectedPresence = usePresence(selectedMemberId);
    const selectedMember = React.useMemo(() => {
        if (!selectedMemberId) {
            return null;
        }
        const base = members.find(member => member.id === selectedMemberId);
        if (!base) {
            return null;
        }
        return {
            ...base,
            presence: selectedPresence ?? base.presence
        };
    }, [members, selectedMemberId, selectedPresence]);

    const handleInvite = async (): Promise<void> => {
        if (!onInviteMember) {
            return;
        }
        if (!hasEmailValue) {
            return;
        }
        setSubmitting(true);
        try {
            await onInviteMember(trimmedEmail);
            setEmail('');
        } finally {
            setSubmitting(false);
        }
    };

    const sortedMembers = React.useMemo(() => {
        return [...members].sort((a, b) =>
            (a.firstName ?? a.email).localeCompare(b.firstName ?? b.email)
        );
    }, [members]);

    return (
        <Box
            sx={{
                width: { xs: '100%', lg: 320 },
                position: { lg: 'sticky' },
                top: { lg: theme => theme.spacing(6) },
                alignSelf: 'flex-start',
                borderRadius: 3,
                border: theme => `1px solid ${theme.palette.divider}`,
                backgroundColor: theme => theme.palette.background.paper,
                p: 2,
                maxHeight: { lg: 'calc(100vh - 96px)' },
                overflow: 'auto'
            }}
        >
            <Stack spacing={2}>
                <Box>
                    <Typography variant="subtitle1" fontWeight={600}>
                        Members
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Track presence and manage access for this workspace.
                    </Typography>
                </Box>

                {canInviteMembers ? (
                    <Stack direction="row" spacing={1} alignItems="center">
                        <TextField
                            value={email}
                            onChange={event => setEmail(event.target.value)}
                            placeholder="user@example.com"
                            size="small"
                            fullWidth
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <AddCircleOutlineIcon fontSize="small" color="primary" />
                                    </InputAdornment>
                                )
                            }}
                        />
                        <Button
                            variant="contained"
                            onClick={() => {
                                void handleInvite();
                            }}
                            disabled={isInviteDisabled}
                        >
                            Invite
                        </Button>
                    </Stack>
                ) : null}

                <List dense disablePadding>
                    {sortedMembers.map(member => (
                        <WorkspaceMemberRow
                            key={member.id}
                            member={member}
                            isOwner={owner?.id === member.id}
                            onRemove={
                                canRemoveMembers && onRemoveMember
                                    ? userId => {
                                          void onRemoveMember(userId);
                                      }
                                    : undefined
                            }
                            onSelect={userId => setSelectedMemberId(userId)}
                            disableRemove={isRemoveDisabled}
                        />
                    ))}
                </List>
            </Stack>

            <UserProfileDialog
                userId={selectedMember?.id ?? null}
                snapshot={selectedMember}
                open={Boolean(selectedMember)}
                onClose={() => setSelectedMemberId(null)}
            />
        </Box>
    );
};
