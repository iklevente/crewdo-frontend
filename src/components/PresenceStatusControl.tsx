import React from 'react';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    InputLabel,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    Select,
    Stack,
    TextField,
    Typography
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import EditNoteIcon from '@mui/icons-material/EditNote';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import toast from 'react-hot-toast';
import { useAuthStore } from 'store/auth-store';
import { presenceApi } from 'services/presence-api';
import {
    PresenceStateEntry,
    PresenceStatus,
    usePresence,
    usePresenceStore
} from 'store/presence-store';

interface ManualStatusFormState {
    status: PresenceStatus;
    customStatus: string;
}

const quickStatuses: { value: PresenceStatus; label: string; description: string }[] = [
    {
        value: 'away',
        label: 'Away',
        description: 'Let teammates know you are stepping away'
    },
    {
        value: 'busy',
        label: 'Busy',
        description: 'Silence notifications while you focus'
    }
];

const resolveButtonLabel = (presence?: PresenceStateEntry): string => {
    if (!presence) {
        return 'Offline';
    }

    const base = presence.status.charAt(0).toUpperCase() + presence.status.slice(1);
    if (presence.customStatus) {
        return `${base} • ${presence.customStatus}`;
    }
    return base;
};

const resolveIndicatorColor = (presence?: PresenceStateEntry): string => {
    switch (presence?.status) {
        case 'online':
            return '#4caf50';
        case 'away':
            return '#ffb300';
        case 'busy':
            return '#f44336';
        default:
            return '#9e9e9e';
    }
};

export const PresenceStatusControl: React.FC = () => {
    const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
    const [isDialogOpen, setDialogOpen] = React.useState(false);
    const [isBusy, setBusy] = React.useState(false);
    const setPresence = usePresenceStore(state => state.setPresence);
    const user = useAuthStore(state => state.user);
    const presence = usePresence(user?.id);

    const [formState, setFormState] = React.useState<ManualStatusFormState>({
        status: 'away',
        customStatus: ''
    });

    const handleOpenMenu = (event: React.MouseEvent<HTMLButtonElement>): void => {
        setAnchorEl(event.currentTarget);
    };

    const handleCloseMenu = (): void => {
        setAnchorEl(null);
    };

    const applyPresenceResponse = React.useCallback(
        (response: PresenceStateEntry, userId: string | undefined): void => {
            if (!userId) {
                return;
            }
            setPresence(userId, response);
        },
        [setPresence]
    );

    const handleClearManual = async (): Promise<void> => {
        if (!user?.id) {
            return;
        }
        try {
            setBusy(true);
            const response = await presenceApi.clearManual();
            applyPresenceResponse(presenceApi.toStateEntry(response), user.id);
            toast.success('Presence status set to automatic');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to clear status';
            toast.error(message);
        } finally {
            setBusy(false);
            handleCloseMenu();
        }
    };

    const handleSetQuickStatus = async (status: PresenceStatus): Promise<void> => {
        if (!user?.id) {
            return;
        }

        if (status === 'online') {
            await handleClearManual();
            return;
        }

        try {
            setBusy(true);
            const response = await presenceApi.setManual({ status });
            applyPresenceResponse(presenceApi.toStateEntry(response), user.id);
            toast.success(`Status set to ${status}`);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to update status';
            toast.error(message);
        } finally {
            setBusy(false);
            handleCloseMenu();
        }
    };

    const handleOpenDialog = (): void => {
        setFormState({
            status: presence?.manualStatus ?? presence?.status ?? 'away',
            customStatus: presence?.manualCustomStatus ?? presence?.customStatus ?? ''
        });
        setDialogOpen(true);
        handleCloseMenu();
    };

    const handleCloseDialog = (): void => {
        setDialogOpen(false);
    };

    const handleSubmitDialog = async (event: React.FormEvent): Promise<void> => {
        event.preventDefault();
        if (!user?.id) {
            return;
        }

        try {
            setBusy(true);
            const response = await presenceApi.setManual({
                status: formState.status,
                customStatus: formState.customStatus?.trim() || undefined
            });
            applyPresenceResponse(presenceApi.toStateEntry(response), user.id);
            toast.success('Presence status updated');
            setDialogOpen(false);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to update status';
            toast.error(message);
        } finally {
            setBusy(false);
        }
    };

    const open = Boolean(anchorEl);
    const buttonLabel = resolveButtonLabel(presence);
    const indicatorColor = resolveIndicatorColor(presence);

    return (
        <>
            <Button
                color="inherit"
                onClick={handleOpenMenu}
                disabled={!user}
                sx={{ textTransform: 'none', gap: 1, paddingInline: 1.5 }}
            >
                <Box
                    sx={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        backgroundColor: indicatorColor,
                        boxShadow: theme => `0 0 0 2px ${theme.palette.background.paper}`
                    }}
                />
                <Typography variant="body2" color="inherit">
                    {buttonLabel}
                </Typography>
            </Button>

            <Menu anchorEl={anchorEl} open={open} onClose={handleCloseMenu} disableAutoFocusItem>
                <MenuItem onClick={() => void handleSetQuickStatus('online')} disabled={isBusy}>
                    <ListItemIcon>
                        <CheckIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                        primary="Automatic (online/offline)"
                        secondary="Let Crewdo manage your presence"
                    />
                </MenuItem>
                {quickStatuses.map(item => (
                    <MenuItem
                        key={item.value}
                        onClick={() => {
                            void handleSetQuickStatus(item.value);
                        }}
                        disabled={isBusy}
                    >
                        <ListItemIcon>
                            <AutoFixHighIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary={item.label} secondary={item.description} />
                    </MenuItem>
                ))}
                <MenuItem onClick={handleOpenDialog} disabled={isBusy}>
                    <ListItemIcon>
                        <EditNoteIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                        primary="Set custom status"
                        secondary="Choose a status and optional note"
                    />
                </MenuItem>
            </Menu>

            <Dialog open={isDialogOpen} onClose={handleCloseDialog} fullWidth maxWidth="xs">
                <form
                    onSubmit={event => {
                        void handleSubmitDialog(event);
                    }}
                >
                    <DialogTitle>Set custom status</DialogTitle>
                    <DialogContent>
                        <Stack spacing={2} sx={{ mt: 1 }}>
                            <FormControl fullWidth>
                                <InputLabel id="presence-status-select-label">Status</InputLabel>
                                <Select
                                    labelId="presence-status-select-label"
                                    value={formState.status}
                                    label="Status"
                                    onChange={event =>
                                        setFormState(prev => ({
                                            ...prev,
                                            status: event.target.value as PresenceStatus
                                        }))
                                    }
                                >
                                    <MenuItem value="online">Online</MenuItem>
                                    <MenuItem value="away">Away</MenuItem>
                                    <MenuItem value="busy">Busy</MenuItem>
                                </Select>
                            </FormControl>
                            <TextField
                                label="Custom message"
                                value={formState.customStatus}
                                onChange={event =>
                                    setFormState(prev => ({
                                        ...prev,
                                        customStatus: event.target.value.slice(0, 160)
                                    }))
                                }
                                helperText="Optional. Visible to teammates alongside your status."
                                inputProps={{ maxLength: 160 }}
                                fullWidth
                            />
                        </Stack>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseDialog} disabled={isBusy}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isBusy}
                            variant="contained"
                            sx={{ textTransform: 'none' }}
                        >
                            Save
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>
        </>
    );
};
