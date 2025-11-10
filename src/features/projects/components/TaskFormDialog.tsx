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
import { Controller, useForm } from 'react-hook-form';
import type { ProjectMember } from '../types/project';
import type { TaskPriority, TaskStatus } from '../types/task';
import { TASK_PRIORITY_METADATA, TASK_STATUS_METADATA } from '../types/task';

export interface TaskFormData {
    readonly title: string;
    readonly description?: string;
    readonly status: TaskStatus;
    readonly priority: TaskPriority;
    readonly dueDate?: string | null;
    readonly estimatedHours?: number | null;
    readonly actualHours?: number | null;
    readonly assigneeId?: string | null;
    readonly tags?: string[];
}

interface TaskFormDialogProps {
    readonly open: boolean;
    readonly title: string;
    readonly submitLabel: string;
    readonly defaultStatus?: TaskStatus;
    readonly initialValues?: Partial<TaskFormData>;
    readonly initialAssignee?: ProjectMember | null;
    readonly participants: ProjectMember[];
    readonly isSubmitting?: boolean;
    readonly onClose: () => void;
    readonly onSubmit: (values: TaskFormData) => Promise<void>;
}

interface TaskFormFields extends Omit<TaskFormData, 'tags'> {
    readonly tags: string;
}

const STATUS_OPTIONS = Object.entries(TASK_STATUS_METADATA).map(([value, meta]) => ({
    value: value as TaskStatus,
    label: meta.label
}));

const PRIORITY_OPTIONS = Object.entries(TASK_PRIORITY_METADATA).map(([value, meta]) => ({
    value: value as TaskPriority,
    label: meta.label
}));

const normalizeDate = (value?: string | null): string => {
    if (!value) {
        return '';
    }
    return value.slice(0, 10);
};

const parseTags = (input: string): string[] =>
    input
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

export const TaskFormDialog: React.FC<TaskFormDialogProps> = ({
    open,
    title,
    submitLabel,
    defaultStatus,
    initialValues,
    initialAssignee,
    participants,
    isSubmitting,
    onClose,
    onSubmit
}) => {
    const {
        register,
        control,
        handleSubmit,
        reset,
        formState: { errors }
    } = useForm<TaskFormFields>({
        defaultValues: {
            title: initialValues?.title ?? '',
            description: initialValues?.description ?? '',
            status: initialValues?.status ?? defaultStatus ?? STATUS_OPTIONS[0]?.value,
            priority: initialValues?.priority ?? PRIORITY_OPTIONS[1]?.value,
            dueDate: normalizeDate(initialValues?.dueDate ?? null),
            estimatedHours: initialValues?.estimatedHours ?? null,
            actualHours: initialValues?.actualHours ?? null,
            assigneeId: initialValues?.assigneeId ?? '',
            tags: initialValues?.tags?.join(', ') ?? ''
        }
    });

    const assigneeOptions = React.useMemo(() => {
        if (!initialAssignee?.id) {
            return participants;
        }
        const alreadyIncluded = participants.some(
            participant => participant.id === initialAssignee.id
        );
        return alreadyIncluded ? participants : [...participants, initialAssignee];
    }, [initialAssignee, participants]);

    React.useEffect(() => {
        if (open) {
            reset({
                title: initialValues?.title ?? '',
                description: initialValues?.description ?? '',
                status: initialValues?.status ?? defaultStatus ?? STATUS_OPTIONS[0]?.value,
                priority: initialValues?.priority ?? PRIORITY_OPTIONS[1]?.value,
                dueDate: normalizeDate(initialValues?.dueDate ?? null),
                estimatedHours: initialValues?.estimatedHours ?? null,
                actualHours: initialValues?.actualHours ?? null,
                assigneeId: initialValues?.assigneeId ?? '',
                tags: initialValues?.tags?.join(', ') ?? ''
            });
        }
    }, [defaultStatus, initialValues, open, reset]);

    const handleFormSubmit: () => Promise<void> = handleSubmit(async values => {
        const payload: TaskFormData = {
            title: values.title,
            description: values.description?.trim() ? values.description : undefined,
            status: values.status,
            priority: values.priority,
            dueDate: values.dueDate ?? null,
            estimatedHours: values.estimatedHours ?? null,
            actualHours: values.actualHours ?? null,
            assigneeId: values.assigneeId ?? null,
            tags: parseTags(values.tags)
        };
        await onSubmit(payload);
        onClose();
    });

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>{title}</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <TextField
                        label="Title"
                        fullWidth
                        required
                        {...register('title', { required: 'Title is required' })}
                        error={Boolean(errors.title)}
                        helperText={errors.title?.message}
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
                                    value={field.value ?? defaultStatus ?? STATUS_OPTIONS[0]?.value}
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
                                    value={
                                        field.value ??
                                        PRIORITY_OPTIONS[1]?.value ??
                                        PRIORITY_OPTIONS[0]?.value
                                    }
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
                            label="Due date"
                            type="date"
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            {...register('dueDate')}
                        />
                        <TextField
                            label="Estimated hours"
                            type="number"
                            fullWidth
                            inputProps={{ min: 0 }}
                            {...register('estimatedHours', {
                                setValueAs: value =>
                                    value === '' || value === null ? null : Number(value)
                            })}
                        />
                        <TextField
                            label="Actual hours"
                            type="number"
                            fullWidth
                            inputProps={{ min: 0 }}
                            {...register('actualHours', {
                                setValueAs: value =>
                                    value === '' || value === null ? null : Number(value)
                            })}
                        />
                    </Stack>
                    <Controller
                        name="assigneeId"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                label="Assignee"
                                select
                                fullWidth
                                {...field}
                                value={field.value ?? ''}
                                SelectProps={{ displayEmpty: true }}
                            >
                                <MenuItem value="">
                                    <em>Unassigned</em>
                                </MenuItem>
                                {assigneeOptions.map(participant => {
                                    const fullName =
                                        `${participant.firstName ?? ''} ${participant.lastName ?? ''}`.trim();
                                    const label =
                                        fullName.length > 0
                                            ? fullName
                                            : (participant.email ?? 'Unknown member');
                                    return (
                                        <MenuItem key={participant.id} value={participant.id}>
                                            {label}
                                        </MenuItem>
                                    );
                                })}
                            </TextField>
                        )}
                    />
                    <TextField
                        label="Tags"
                        placeholder="Design, Backend, Blocker"
                        fullWidth
                        helperText="Separate tags with commas"
                        {...register('tags')}
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button
                    variant="contained"
                    disabled={isSubmitting}
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
