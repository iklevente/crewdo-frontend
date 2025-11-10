import React from 'react';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    FormHelperText,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    TextField
} from '@mui/material';
import { Controller, useForm } from 'react-hook-form';
import type { ProjectPriority, ProjectStatus } from '../types/project';
import { PROJECT_PRIORITY_METADATA, PROJECT_STATUS_METADATA } from '../types/project';

export interface ProjectFormValues {
    readonly name: string;
    readonly description?: string;
    readonly status: ProjectStatus;
    readonly priority: ProjectPriority;
    readonly startDate?: string | null;
    readonly endDate?: string | null;
    readonly deadline?: string | null;
    readonly budget?: number | null;
    readonly color?: string | null;
    readonly workspaceId: string;
}

interface ProjectFormDialogProps {
    readonly open: boolean;
    readonly title: string;
    readonly submitLabel: string;
    readonly initialValues?: Partial<ProjectFormValues>;
    readonly isSubmitting?: boolean;
    readonly onClose: () => void;
    readonly onSubmit: (values: ProjectFormValues) => Promise<void>;
    readonly workspaceOptions: { readonly id: string; readonly name: string }[];
    readonly defaultWorkspaceId?: string | null;
}

const STATUS_OPTIONS = Object.entries(PROJECT_STATUS_METADATA).map(([value, meta]) => ({
    value: value as ProjectStatus,
    label: meta.label
}));

const PRIORITY_OPTIONS = Object.entries(PROJECT_PRIORITY_METADATA).map(([value, meta]) => ({
    value: value as ProjectPriority,
    label: meta.label
}));

const normalizeDate = (value?: string | null): string => {
    if (!value) {
        return '';
    }
    return value.slice(0, 10);
};

const FALLBACK_STATUS = STATUS_OPTIONS[0]?.value ?? 'planning';
const FALLBACK_PRIORITY = PRIORITY_OPTIONS[1]?.value ?? PRIORITY_OPTIONS[0]?.value ?? 'medium';

export const ProjectFormDialog: React.FC<ProjectFormDialogProps> = ({
    open,
    title,
    submitLabel,
    initialValues,
    isSubmitting,
    onClose,
    onSubmit,
    workspaceOptions,
    defaultWorkspaceId
}) => {
    const defaultFormValues = React.useMemo<ProjectFormValues>(() => {
        const workspaceId =
            initialValues?.workspaceId ?? defaultWorkspaceId ?? workspaceOptions[0]?.id ?? '';
        return {
            name: initialValues?.name ?? '',
            description: initialValues?.description ?? '',
            status: initialValues?.status ?? FALLBACK_STATUS,
            priority: initialValues?.priority ?? FALLBACK_PRIORITY,
            startDate: normalizeDate(initialValues?.startDate),
            endDate: normalizeDate(initialValues?.endDate),
            deadline: normalizeDate(initialValues?.deadline),
            budget: initialValues?.budget ?? null,
            color: initialValues?.color ?? '#2196f3',
            workspaceId
        };
    }, [defaultWorkspaceId, initialValues, workspaceOptions]);

    const {
        register,
        control,
        handleSubmit,
        reset,
        formState: { errors }
    } = useForm<ProjectFormValues>({
        defaultValues: defaultFormValues
    });

    React.useEffect(() => {
        if (open) {
            reset(defaultFormValues);
        }
    }, [defaultFormValues, open, reset]);

    const isWorkspaceListEmpty = workspaceOptions.length === 0;
    const isSubmitDisabled = isSubmitting ?? isWorkspaceListEmpty;

    const handleFormSubmit: () => Promise<void> = handleSubmit(async values => {
        await onSubmit({
            name: values.name,
            description: values.description?.trim() ? values.description : undefined,
            status: values.status,
            priority: values.priority,
            startDate: values.startDate ?? null,
            endDate: values.endDate ?? null,
            deadline: values.deadline ?? null,
            budget: values.budget == null || Number.isNaN(values.budget) ? null : values.budget,
            color: values.color?.trim() ? values.color : null,
            workspaceId: values.workspaceId
        });
        onClose();
    });

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>{title}</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <TextField
                        label="Project name"
                        fullWidth
                        required
                        {...register('name', { required: 'Name is required' })}
                        error={Boolean(errors.name)}
                        helperText={errors.name?.message}
                    />
                    <TextField
                        label="Description"
                        multiline
                        minRows={3}
                        fullWidth
                        {...register('description')}
                    />
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        <Controller
                            name="status"
                            control={control}
                            rules={{ required: 'Status is required' }}
                            render={({ field }) => (
                                <TextField
                                    label="Status"
                                    select
                                    fullWidth
                                    required
                                    {...field}
                                    value={field.value ?? FALLBACK_STATUS}
                                    error={Boolean(errors.status)}
                                    helperText={errors.status?.message}
                                >
                                    {STATUS_OPTIONS.map(option => (
                                        <MenuItem key={option.value} value={option.value}>
                                            {option.label}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            )}
                        />
                        <Controller
                            name="priority"
                            control={control}
                            rules={{ required: 'Priority is required' }}
                            render={({ field }) => (
                                <TextField
                                    label="Priority"
                                    select
                                    fullWidth
                                    required
                                    {...field}
                                    value={field.value ?? FALLBACK_PRIORITY}
                                    error={Boolean(errors.priority)}
                                    helperText={errors.priority?.message}
                                >
                                    {PRIORITY_OPTIONS.map(option => (
                                        <MenuItem key={option.value} value={option.value}>
                                            {option.label}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            )}
                        />
                    </Stack>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        <TextField
                            label="Start date"
                            type="date"
                            InputLabelProps={{ shrink: true }}
                            fullWidth
                            {...register('startDate')}
                        />
                        <TextField
                            label="End date"
                            type="date"
                            InputLabelProps={{ shrink: true }}
                            fullWidth
                            {...register('endDate')}
                        />
                        <TextField
                            label="Deadline"
                            type="date"
                            InputLabelProps={{ shrink: true }}
                            fullWidth
                            {...register('deadline')}
                        />
                    </Stack>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        <TextField
                            label="Budget"
                            type="number"
                            fullWidth
                            inputProps={{ min: 0 }}
                            {...register('budget', {
                                setValueAs: value =>
                                    value === '' || value === null ? null : Number(value)
                            })}
                        />
                        <TextField
                            label="Accent color"
                            type="color"
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            {...register('color')}
                        />
                    </Stack>
                    <Controller
                        name="workspaceId"
                        control={control}
                        rules={{ required: 'Workspace is required' }}
                        render={({ field }) => (
                            <FormControl fullWidth required error={Boolean(errors.workspaceId)}>
                                <InputLabel id="project-workspace-select-label">
                                    Workspace *
                                </InputLabel>
                                <Select
                                    labelId="project-workspace-select-label"
                                    label="Workspace"
                                    disabled={isWorkspaceListEmpty}
                                    {...field}
                                >
                                    {workspaceOptions.map(option => (
                                        <MenuItem key={option.id} value={option.id}>
                                            {option.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                                {errors.workspaceId ? (
                                    <FormHelperText>{errors.workspaceId.message}</FormHelperText>
                                ) : isWorkspaceListEmpty ? (
                                    <FormHelperText>
                                        Create a workspace before adding a project.
                                    </FormHelperText>
                                ) : null}
                            </FormControl>
                        )}
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button
                    variant="contained"
                    disabled={isSubmitDisabled}
                    onClick={() => {
                        void handleFormSubmit().catch(() => undefined);
                    }}
                >
                    {submitLabel}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
