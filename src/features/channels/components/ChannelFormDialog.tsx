import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Stack,
    TextField,
    MenuItem,
    Button,
    Typography
} from '@mui/material';

export interface ChannelFormValues {
    readonly name: string;
    readonly description?: string;
    readonly topic?: string;
    readonly visibility: string;
}

interface ChannelFormDialogProps {
    readonly open: boolean;
    readonly title: string;
    readonly submitLabel: string;
    readonly onClose: () => void;
    readonly onSubmit: (values: ChannelFormValues) => Promise<void>;
    readonly initialValues?: ChannelFormValues;
    readonly isSubmitting?: boolean;
}

const VISIBILITY_OPTIONS = [
    { value: 'public', label: 'Public' },
    { value: 'private', label: 'Private' }
];

export const ChannelFormDialog: React.FC<ChannelFormDialogProps> = ({
    open,
    title,
    submitLabel,
    onClose,
    onSubmit,
    initialValues,
    isSubmitting
}) => {
    const [values, setValues] = React.useState<ChannelFormValues>(
        initialValues ?? {
            name: '',
            description: '',
            topic: '',
            visibility: 'public'
        }
    );

    React.useEffect(() => {
        if (open) {
            setValues(
                initialValues ?? {
                    name: '',
                    description: '',
                    topic: '',
                    visibility: 'public'
                }
            );
        }
    }, [open, initialValues]);

    const handleSubmit = async (event: React.FormEvent): Promise<void> => {
        event.preventDefault();

        const name = values.name.trim();
        const description = values.description?.trim();
        const topic = values.topic?.trim();

        await onSubmit({
            name,
            description: description === '' ? undefined : description,
            topic: topic === '' ? undefined : topic,
            visibility: values.visibility
        });
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>{title}</DialogTitle>
            <form onSubmit={event => void handleSubmit(event)}>
                <DialogContent dividers>
                    <Stack spacing={2}>
                        <TextField
                            label="Channel name"
                            value={values.name}
                            onChange={event =>
                                setValues(prev => ({ ...prev, name: event.target.value }))
                            }
                            required
                            autoFocus
                        />
                        <TextField
                            label="Description"
                            value={values.description ?? ''}
                            onChange={event =>
                                setValues(prev => ({
                                    ...prev,
                                    description: event.target.value
                                }))
                            }
                            multiline
                            minRows={2}
                        />
                        <TextField
                            label="Topic"
                            value={values.topic ?? ''}
                            onChange={event =>
                                setValues(prev => ({
                                    ...prev,
                                    topic: event.target.value
                                }))
                            }
                        />
                        <TextField
                            label="Visibility"
                            select
                            value={values.visibility}
                            onChange={event =>
                                setValues(prev => ({
                                    ...prev,
                                    visibility: event.target.value
                                }))
                            }
                        >
                            {VISIBILITY_OPTIONS.map(option => (
                                <MenuItem key={option.value} value={option.value}>
                                    {option.label}
                                </MenuItem>
                            ))}
                        </TextField>
                        <Typography variant="body2" color="text.secondary">
                            Channel visibility controls who can discover and join this channel.
                        </Typography>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose}>Cancel</Button>
                    <Button
                        type="submit"
                        variant="contained"
                        disabled={isSubmitting ? true : values.name.trim().length === 0}
                    >
                        {submitLabel}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
};
