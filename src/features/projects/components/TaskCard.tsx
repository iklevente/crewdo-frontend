import React from 'react';
import { Avatar, Box, Chip, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/EditOutlined';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import CommentIcon from '@mui/icons-material/ChatBubbleOutline';
import AccessTimeIcon from '@mui/icons-material/AccessTimeOutlined';
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';
import type { ProjectTask, TaskAssignee } from '../types/task';
import { TASK_PRIORITY_METADATA } from '../types/task';

interface TaskCardProps {
    readonly task: ProjectTask;
    readonly onEdit: (task: ProjectTask) => void;
    readonly onDelete: (task: ProjectTask) => void;
}

const getAvatarLabel = (task: ProjectTask): string => {
    const assignee = task.assignee ?? task.creator;
    const initialsSource = `${assignee.firstName?.[0] ?? ''}${assignee.lastName?.[0] ?? ''}`.trim();
    if (initialsSource.length > 0) {
        return initialsSource.toUpperCase();
    }
    return assignee.email?.charAt(0)?.toUpperCase() ?? '?';
};

const getPersonDisplayName = (
    person: TaskAssignee | null | undefined,
    fallback: string
): string => {
    if (!person) {
        return fallback;
    }
    const fullName = `${person.firstName ?? ''} ${person.lastName ?? ''}`.trim();
    if (fullName.length > 0) {
        return fullName;
    }
    return person.email ?? fallback;
};

export const TaskCard: React.FC<TaskCardProps> = ({ task, onEdit, onDelete }) => {
    const priorityMeta = TASK_PRIORITY_METADATA[task.priority];
    const dueDateLabel = task.dueDate
        ? formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })
        : null;
    const assigneeLabel = getPersonDisplayName(task.assignee, 'Unassigned');
    const creatorLabel = getPersonDisplayName(task.creator, 'Unknown');

    return (
        <Box
            sx={{
                p: 2,
                borderRadius: 2,
                border: theme => `1px solid ${theme.palette.divider}`,
                bgcolor: 'background.paper',
                boxShadow: theme => theme.shadows[1],
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5
            }}
        >
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                    <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                        {task.title}
                    </Typography>
                    {task.description ? (
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                                display: '-webkit-box',
                                WebkitLineClamp: 3,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden'
                            }}
                        >
                            {task.description}
                        </Typography>
                    ) : null}
                </Box>
                <Stack direction="row" spacing={1} alignItems="center">
                    <Tooltip title="Edit task">
                        <IconButton size="small" onClick={() => onEdit(task)}>
                            <EditIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete task">
                        <IconButton size="small" onClick={() => onDelete(task)}>
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Stack>
            </Stack>

            <Stack direction="row" alignItems="center" spacing={1}>
                <Chip
                    size="small"
                    label={priorityMeta.label}
                    sx={{ bgcolor: priorityMeta.color, color: 'common.white' }}
                />
                {dueDateLabel ? (
                    <Stack direction="row" spacing={0.5} alignItems="center" color="text.secondary">
                        <AccessTimeIcon fontSize="inherit" />
                        <Typography variant="caption">Due {dueDateLabel}</Typography>
                    </Stack>
                ) : null}
                {typeof task.commentCount === 'number' && task.commentCount > 0 ? (
                    <Stack direction="row" spacing={0.5} alignItems="center" color="text.secondary">
                        <CommentIcon fontSize="inherit" />
                        <Typography variant="caption">{task.commentCount}</Typography>
                    </Stack>
                ) : null}
            </Stack>

            <Stack direction="row" alignItems="center" spacing={1.5}>
                <Avatar sx={{ width: 32, height: 32 }}>{getAvatarLabel(task)}</Avatar>
                <Box>
                    <Typography variant="body2" fontWeight={500}>
                        {assigneeLabel}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        Created by {creatorLabel}
                    </Typography>
                </Box>
            </Stack>

            {task.tags.length > 0 ? (
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {task.tags.map(tag => (
                        <Chip key={tag} size="small" label={`#${tag}`} variant="outlined" />
                    ))}
                </Stack>
            ) : null}
        </Box>
    );
};
