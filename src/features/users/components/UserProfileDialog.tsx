import React from 'react';
import {
    Avatar,
    Box,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    IconButton,
    Stack,
    Tooltip,
    Typography,
    Button,
    CircularProgress,
    Alert
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useQuery } from '@tanstack/react-query';
import type { UserResponseDto } from 'api/models/user-response-dto';
import { apiClients } from 'services/api-clients';
import { PresenceBadge } from 'components/PresenceBadge';
import { usePresence } from 'store/presence-store';
import type { UserProfileSnapshot } from '../types/user-profile-snapshot';

const USER_PROFILE_QUERY_KEY = (userId: string): readonly [string, string] => [
    'user-profile',
    userId
];

interface UserProfileDialogProps {
    readonly userId: string | null;
    readonly snapshot?: UserProfileSnapshot | null;
    readonly open: boolean;
    readonly onClose: () => void;
}

const formatDateTime = (value?: string): string => {
    if (!value) {
        return 'Unknown';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }
    return date.toLocaleString();
};

const computeInitials = (snapshot?: UserProfileSnapshot | null): string => {
    if (!snapshot) {
        return 'U';
    }
    const fallback = snapshot.email?.charAt(0)?.toUpperCase() ?? 'U';
    const combined = `${snapshot.firstName?.[0] ?? ''}${snapshot.lastName?.[0] ?? ''}`.trim();
    return combined.length > 0 ? combined.toUpperCase() : fallback;
};

export const UserProfileDialog: React.FC<UserProfileDialogProps> = ({
    userId,
    snapshot,
    open,
    onClose
}) => {
    const queryKey = React.useMemo<readonly [string, string]>(
        () => USER_PROFILE_QUERY_KEY(userId ?? 'unknown'),
        [userId]
    );

    const {
        data: profile,
        isLoading,
        isError
    } = useQuery<UserResponseDto>({
        queryKey,
        queryFn: async () => {
            if (!userId) {
                throw new Error('User identifier missing');
            }
            const response = await apiClients.users.usersControllerFindOne(userId);
            return response.data as unknown as UserResponseDto;
        },
        enabled: open && Boolean(userId)
    });

    const livePresence = usePresence(userId);
    const presence = livePresence ?? snapshot?.presence;
    const avatarSrc = profile?.profilePicture ?? snapshot?.profilePicture ?? undefined;
    const extendedProfile = profile as
        | (UserResponseDto & {
              status?: string;
              lastLoginAt?: string;
          })
        | null;
    const displayName =
        profile && (profile.firstName || profile.lastName)
            ? `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim()
            : snapshot && (snapshot.firstName || snapshot.lastName)
              ? `${snapshot.firstName ?? ''} ${snapshot.lastName ?? ''}`.trim()
              : (profile?.email ?? snapshot?.email ?? 'Unknown user');

    const roleLabel = profile?.role
        ? profile.role.replace(/_/g, ' ').replace(/\b\w/g, (letter: string) => letter.toUpperCase())
        : 'Member';

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ pr: 6 }}>
                User profile
                <IconButton
                    onClick={onClose}
                    size="small"
                    sx={{ position: 'absolute', top: 12, right: 12 }}
                    aria-label="Close profile dialog"
                >
                    <CloseIcon fontSize="small" />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <Stack spacing={3}>
                    <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar src={avatarSrc} sx={{ width: 64, height: 64 }}>
                            {computeInitials(snapshot)}
                        </Avatar>
                        <Stack spacing={0.5}>
                            <Typography variant="h6" fontWeight={600}>
                                {displayName}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {profile?.email ?? snapshot?.email ?? 'Email unavailable'}
                            </Typography>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <Chip size="small" label={roleLabel} />
                                <PresenceBadge
                                    status={presence?.status}
                                    customStatus={presence?.customStatus}
                                />
                            </Stack>
                        </Stack>
                    </Stack>

                    {isLoading ? (
                        <Stack direction="row" spacing={1} alignItems="center">
                            <CircularProgress size={18} />
                            <Typography variant="body2" color="text.secondary">
                                Loading profile details…
                            </Typography>
                        </Stack>
                    ) : null}

                    {isError ? (
                        <Alert severity="error">
                            We could not load additional details for this user. You might not have
                            permission to view their profile.
                        </Alert>
                    ) : null}

                    {profile ? (
                        <Stack spacing={2}>
                            <Box>
                                <Typography variant="subtitle2" color="text.secondary">
                                    Contact
                                </Typography>
                                <Typography variant="body2">
                                    Phone: {profile.phoneNumber ?? 'Not provided'}
                                </Typography>
                                <Typography variant="body2">
                                    Department: {profile.department ?? 'Not provided'}
                                </Typography>
                                <Typography variant="body2">
                                    Position: {profile.position ?? 'Not provided'}
                                </Typography>
                            </Box>

                            <Divider />

                            <Box>
                                <Typography variant="subtitle2" color="text.secondary">
                                    Role & status
                                </Typography>
                                <Typography variant="body2">Role: {roleLabel}</Typography>
                                <Typography variant="body2">
                                    Status:{' '}
                                    {extendedProfile?.status
                                        ? extendedProfile.status.replace(/_/g, ' ')
                                        : 'Active'}
                                </Typography>
                            </Box>

                            <Divider />

                            <Box>
                                <Typography variant="subtitle2" color="text.secondary">
                                    Account metadata
                                </Typography>
                                <Typography variant="body2">
                                    Email verified: {profile.isEmailVerified ? 'Yes' : 'No'}
                                </Typography>
                                <Typography variant="body2">
                                    Created: {formatDateTime(profile.createdAt)}
                                </Typography>
                                <Typography variant="body2">
                                    Updated: {formatDateTime(profile.updatedAt)}
                                </Typography>
                                <Typography variant="body2">
                                    Last login: {formatDateTime(extendedProfile?.lastLoginAt)}
                                </Typography>
                                <Typography variant="body2">User ID: {profile.id}</Typography>
                            </Box>
                        </Stack>
                    ) : null}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Tooltip title="Close">
                    <Button onClick={onClose}>Close</Button>
                </Tooltip>
            </DialogActions>
        </Dialog>
    );
};
