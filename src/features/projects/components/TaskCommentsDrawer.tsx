import React from 'react';
import {
    Alert,
    Avatar,
    Box,
    Button,
    CircularProgress,
    Divider,
    Drawer,
    IconButton,
    Stack,
    TextField,
    Tooltip,
    Typography
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';
import { useAuthStore } from 'store/auth-store';
import { useTaskComments } from '../hooks/useTaskComments';
import type { ProjectTask } from '../types/task';
import type { TaskComment } from '../types/comment';

interface TaskCommentsDrawerProps {
    readonly task: ProjectTask | null;
    readonly open: boolean;
    readonly onClose: () => void;
    readonly onCommentCreated?: () => void | Promise<void>;
    readonly onCommentDeleted?: () => void | Promise<void>;
}

const getAuthorDisplayName = (comment: TaskComment): string => {
    const { author } = comment;
    const fullName = `${author.firstName ?? ''} ${author.lastName ?? ''}`.trim();
    if (fullName.length > 0) {
        return fullName;
    }
    return author.email;
};

const getAuthorInitials = (comment: TaskComment): string => {
    const { author } = comment;
    const initialsSource = `${author.firstName?.[0] ?? ''}${author.lastName?.[0] ?? ''}`.trim();
    if (initialsSource.length > 0) {
        return initialsSource.toUpperCase();
    }
    return author.email.charAt(0).toUpperCase();
};

const formatTimestamp = (isoDate: string): string => {
    if (!isoDate) {
        return '';
    }
    return formatDistanceToNow(new Date(isoDate), { addSuffix: true });
};

export const TaskCommentsDrawer: React.FC<TaskCommentsDrawerProps> = ({
    task,
    open,
    onClose,
    onCommentCreated,
    onCommentDeleted
}) => {
    const taskId = task?.id ?? null;
    const { comments, isLoading, isError, isCreating, isDeleting, createComment, deleteComment } =
        useTaskComments(taskId);
    const currentUserId = useAuthStore(state => state.user?.id ?? null);
    const [message, setMessage] = React.useState('');
    const [pendingDeleteId, setPendingDeleteId] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (!open) {
            setMessage('');
            setPendingDeleteId(null);
        }
    }, [open]);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
        event.preventDefault();
        const trimmed = message.trim();
        if (!trimmed || !taskId) {
            return;
        }
        try {
            await createComment(trimmed);
            setMessage('');
            if (onCommentCreated) {
                await Promise.resolve(onCommentCreated());
            }
        } catch {
            // Errors are surfaced via toasts; no rethrow needed.
        }
    };

    const handleDelete = async (commentId: string): Promise<void> => {
        setPendingDeleteId(commentId);
        try {
            await deleteComment(commentId);
            if (onCommentDeleted) {
                await Promise.resolve(onCommentDeleted());
            }
        } finally {
            setPendingDeleteId(null);
        }
    };

    const commentSummary = React.useMemo(() => {
        const count = comments.length;
        if (count === 0) {
            return 'No comments yet';
        }
        return `${count} ${count === 1 ? 'comment' : 'comments'}`;
    }, [comments.length]);

    return (
        <Drawer
            anchor="right"
            open={open}
            onClose={onClose}
            PaperProps={{
                sx: {
                    width: { xs: '100%', sm: 420 },
                    maxWidth: '100%',
                    display: 'flex'
                }
            }}
        >
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        p: 2
                    }}
                >
                    <Box>
                        <Typography variant="subtitle2" color="text.secondary">
                            {task ? 'Task comments' : 'No task selected'}
                        </Typography>
                        <Typography variant="h6" fontWeight={600} gutterBottom>
                            {task?.title ?? 'Select a task'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {commentSummary}
                        </Typography>
                    </Box>
                    <IconButton onClick={onClose}>
                        <CloseIcon />
                    </IconButton>
                </Box>
                <Divider />

                <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
                    {!taskId ? (
                        <Stack
                            spacing={2}
                            alignItems="center"
                            justifyContent="center"
                            sx={{ height: '100%' }}
                        >
                            <Typography variant="body2" color="text.secondary">
                                Select a task to see its conversation.
                            </Typography>
                        </Stack>
                    ) : isLoading ? (
                        <Stack
                            spacing={2}
                            alignItems="center"
                            justifyContent="center"
                            sx={{ height: '100%' }}
                        >
                            <CircularProgress size={24} />
                            <Typography variant="body2" color="text.secondary">
                                Loading comments…
                            </Typography>
                        </Stack>
                    ) : isError ? (
                        <Alert severity="error">
                            We could not load comments for this task. Try again in a moment.
                        </Alert>
                    ) : comments.length === 0 ? (
                        <Stack
                            spacing={2}
                            alignItems="center"
                            justifyContent="center"
                            sx={{ height: '100%' }}
                        >
                            <Typography variant="body2" color="text.secondary" align="center">
                                Be the first to leave a note for your team.
                            </Typography>
                        </Stack>
                    ) : (
                        <Stack spacing={2}>
                            {comments.map(comment => {
                                const canManage = currentUserId === comment.author.id;
                                return (
                                    <Box
                                        key={comment.id}
                                        sx={{
                                            borderRadius: 2,
                                            border: theme => `1px solid ${theme.palette.divider}`,
                                            p: 2,
                                            bgcolor: 'background.paper'
                                        }}
                                    >
                                        <Stack spacing={1.5}>
                                            <Stack
                                                direction="row"
                                                spacing={1.5}
                                                alignItems="flex-start"
                                            >
                                                <Avatar sx={{ width: 36, height: 36 }}>
                                                    {getAuthorInitials(comment)}
                                                </Avatar>
                                                <Box sx={{ flex: 1 }}>
                                                    <Stack
                                                        direction="row"
                                                        spacing={1}
                                                        alignItems="center"
                                                    >
                                                        <Typography
                                                            variant="subtitle2"
                                                            fontWeight={600}
                                                        >
                                                            {getAuthorDisplayName(comment)}
                                                        </Typography>
                                                        <Typography
                                                            variant="caption"
                                                            color="text.secondary"
                                                        >
                                                            {formatTimestamp(comment.createdAt)}
                                                        </Typography>
                                                        {comment.isEdited ? (
                                                            <Typography
                                                                variant="caption"
                                                                color="text.secondary"
                                                            >
                                                                • Edited
                                                            </Typography>
                                                        ) : null}
                                                    </Stack>
                                                    <Typography
                                                        variant="body2"
                                                        color="text.primary"
                                                    >
                                                        {comment.content}
                                                    </Typography>
                                                </Box>
                                                {canManage ? (
                                                    <Tooltip title="Delete comment">
                                                        <span>
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => {
                                                                    void handleDelete(comment.id);
                                                                }}
                                                                disabled={
                                                                    isDeleting &&
                                                                    pendingDeleteId === comment.id
                                                                }
                                                            >
                                                                {isDeleting &&
                                                                pendingDeleteId === comment.id ? (
                                                                    <CircularProgress size={16} />
                                                                ) : (
                                                                    <DeleteIcon fontSize="small" />
                                                                )}
                                                            </IconButton>
                                                        </span>
                                                    </Tooltip>
                                                ) : null}
                                            </Stack>
                                        </Stack>
                                    </Box>
                                );
                            })}
                        </Stack>
                    )}
                </Box>

                <Divider />

                <Box
                    component="form"
                    onSubmit={event => {
                        void handleSubmit(event);
                    }}
                    sx={{ p: 2, borderTop: theme => `1px solid ${theme.palette.divider}` }}
                >
                    <Stack spacing={1.5}>
                        <TextField
                            label="Add a comment"
                            placeholder="Share an update with your team"
                            multiline
                            minRows={3}
                            value={message}
                            onChange={event => setMessage(event.target.value)}
                            disabled={!taskId || isCreating}
                        />
                        <Stack direction="row" justifyContent="flex-end" spacing={1}>
                            <Button
                                variant="outlined"
                                onClick={() => setMessage('')}
                                disabled={!message.trim() || isCreating}
                            >
                                Clear
                            </Button>
                            <Button
                                type="submit"
                                variant="contained"
                                disabled={!message.trim() || isCreating || !taskId}
                            >
                                {isCreating ? 'Posting…' : 'Post comment'}
                            </Button>
                        </Stack>
                    </Stack>
                </Box>
            </Box>
        </Drawer>
    );
};
