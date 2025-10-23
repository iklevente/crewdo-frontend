import React from 'react';
import {
    Alert,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    TextField,
    Typography
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import SaveIcon from '@mui/icons-material/SaveOutlined';

interface GroupConversationSettingsDialogProps {
    readonly open: boolean;
    readonly initialName: string;
    readonly canDelete: boolean;
    readonly isSaving: boolean;
    readonly isDeleting: boolean;
    readonly onClose: () => void;
    readonly onSave: (name: string) => Promise<void>;
    readonly onDelete?: () => Promise<void>;
}

export const GroupConversationSettingsDialog: React.FC<GroupConversationSettingsDialogProps> = ({
    open,
    initialName,
    canDelete,
    isSaving,
    isDeleting,
    onClose,
    onSave,
    onDelete
}) => {
    const [name, setName] = React.useState(initialName);
    const [error, setError] = React.useState<string | null>(null);
    const [isConfirmingDelete, setIsConfirmingDelete] = React.useState(false);

    React.useEffect(() => {
        if (open) {
            setName(initialName);
            setError(null);
            setIsConfirmingDelete(false);
        }
    }, [initialName, open]);

    const handleSave = React.useCallback(async (): Promise<void> => {
        const trimmed = name.trim();
        if (trimmed.length === 0) {
            setError('Conversation name cannot be empty.');
            return;
        }

        try {
            await onSave(trimmed);
        } catch (saveError) {
            const message =
                saveError instanceof Error ? saveError.message : 'Failed to update conversation';
            setError(message);
        }
    }, [name, onSave]);

    const handleDelete = React.useCallback(async (): Promise<void> => {
        if (!onDelete) {
            return;
        }
        try {
            await onDelete();
        } catch (deleteError) {
            const message =
                deleteError instanceof Error
                    ? deleteError.message
                    : 'Failed to delete conversation';
            setError(message);
        }
    }, [onDelete]);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Group conversation settings</DialogTitle>
            <DialogContent dividers>
                <Stack spacing={3}>
                    <Box>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                            Conversation name
                        </Typography>
                        <TextField
                            fullWidth
                            value={name}
                            onChange={event => {
                                setName(event.target.value);
                                if (error) {
                                    setError(null);
                                }
                            }}
                            placeholder="Name your group conversation"
                            disabled={isSaving || isDeleting}
                            inputProps={{ maxLength: 120 }}
                        />
                    </Box>
                    {error ? <Alert severity="error">{error}</Alert> : null}
                    {canDelete && onDelete ? (
                        <Box>
                            <Typography variant="subtitle2" color="error" sx={{ mb: 1 }}>
                                Danger zone
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                Removing this group conversation will delete it for everyone. This
                                action cannot be undone.
                            </Typography>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <Button
                                    color="error"
                                    variant={isConfirmingDelete ? 'contained' : 'outlined'}
                                    startIcon={<DeleteIcon fontSize="small" />}
                                    onClick={() => {
                                        if (!isConfirmingDelete) {
                                            setIsConfirmingDelete(true);
                                            return;
                                        }
                                        void handleDelete();
                                    }}
                                    disabled={isDeleting}
                                >
                                    {isConfirmingDelete ? 'Confirm delete' : 'Delete conversation'}
                                </Button>
                                {isConfirmingDelete ? (
                                    <Button
                                        onClick={() => setIsConfirmingDelete(false)}
                                        disabled={isDeleting}
                                    >
                                        Cancel
                                    </Button>
                                ) : null}
                            </Stack>
                        </Box>
                    ) : null}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={isSaving || isDeleting}>
                    Close
                </Button>
                <Button
                    onClick={() => {
                        void handleSave();
                    }}
                    variant="contained"
                    startIcon={<SaveIcon fontSize="small" />}
                    disabled={isSaving || isDeleting || name.trim().length === 0}
                >
                    Save changes
                </Button>
            </DialogActions>
        </Dialog>
    );
};
