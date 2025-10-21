import React from 'react';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    MenuItem,
    Stack,
    TextField
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { CreateWorkspaceDtoTypeEnum } from 'api/models/create-workspace-dto';

interface WorkspaceFormDialogProps {
    readonly open: boolean;
    readonly initialValues?: Partial<WorkspaceFormValues>;
    readonly title: string;
    readonly submitLabel: string;
    readonly onClose: () => void;
    readonly onSubmit: (values: WorkspaceFormValues) => Promise<void>;
    readonly isSubmitting?: boolean;
}

export interface WorkspaceFormValues {
    readonly name: string;
    readonly description?: string;
    readonly type: CreateWorkspaceDtoTypeEnum;
}

const WORKSPACE_TYPE_OPTIONS: readonly {
    readonly value: CreateWorkspaceDtoTypeEnum;
    readonly label: string;
}[] = [
    {
        value: CreateWorkspaceDtoTypeEnum.Company,
        label: 'Company'
    },
    {
        value: CreateWorkspaceDtoTypeEnum.Team,
        label: 'Team'
    },
    {
        value: CreateWorkspaceDtoTypeEnum.Project,
        label: 'Project'
    },
    {
        value: CreateWorkspaceDtoTypeEnum.Community,
        label: 'Community'
    }
];

export const WorkspaceFormDialog: React.FC<WorkspaceFormDialogProps> = ({
    open,
    initialValues,
    title,
    submitLabel,
    onClose,
    onSubmit,
    isSubmitting
}) => {
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors }
    } = useForm<WorkspaceFormValues>({
        defaultValues: {
            name: initialValues?.name ?? '',
            description: initialValues?.description ?? '',
            type: initialValues?.type ?? CreateWorkspaceDtoTypeEnum.Team
        }
    });

    React.useEffect(() => {
        reset({
            name: initialValues?.name ?? '',
            description: initialValues?.description ?? '',
            type: initialValues?.type ?? CreateWorkspaceDtoTypeEnum.Team
        });
    }, [initialValues, reset]);

    const handleFormSubmit: () => Promise<void> = handleSubmit(async values => {
        await onSubmit({
            name: values.name,
            description: values.description,
            type: values.type
        });
        onClose();
    });

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>{title}</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <TextField
                        label="Workspace Name"
                        fullWidth
                        required
                        {...register('name', { required: 'Name is required' })}
                        error={Boolean(errors.name)}
                        helperText={errors.name?.message}
                    />
                    <TextField
                        label="Description"
                        fullWidth
                        multiline
                        minRows={3}
                        {...register('description')}
                    />
                    <TextField
                        label="Type"
                        select
                        fullWidth
                        required
                        {...register('type', { required: 'Type is required' })}
                        error={Boolean(errors.type)}
                        helperText={errors.type?.message}
                    >
                        {WORKSPACE_TYPE_OPTIONS.map(option => (
                            <MenuItem key={option.value} value={option.value}>
                                {option.label}
                            </MenuItem>
                        ))}
                    </TextField>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button
                    onClick={() => {
                        void handleFormSubmit();
                    }}
                    variant="contained"
                    disabled={isSubmitting}
                >
                    {submitLabel}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
