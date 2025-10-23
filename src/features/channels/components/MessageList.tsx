import React from 'react';
import {
    Avatar,
    Box,
    Button,
    Chip,
    CircularProgress,
    IconButton,
    Menu,
    MenuItem,
    Paper,
    Popover,
    TextField,
    Skeleton,
    Stack,
    Tooltip,
    Typography
} from '@mui/material';
import ReplyOutlinedIcon from '@mui/icons-material/ReplyOutlined';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import InsertEmoticonIcon from '@mui/icons-material/InsertEmoticon';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DownloadIcon from '@mui/icons-material/DownloadOutlined';
import DescriptionIcon from '@mui/icons-material/DescriptionOutlined';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import type { Message, MessageAttachment } from 'features/messages/types/message';
import { axiosInstance } from 'services/api-clients';
import { EmojiPicker } from 'features/messages/components/EmojiPicker';
import type { UserProfileSnapshot } from 'features/users/types/user-profile-snapshot';

interface MessageListProps {
    readonly messages: Message[];
    readonly hasMore: boolean;
    readonly isLoadingMore: boolean;
    readonly isInitialLoading: boolean;
    readonly onLoadMore: () => Promise<unknown>;
    readonly currentUserId: string | null;
    readonly onReply: (message: Message) => void;
    readonly onToggleReaction: (messageId: string, emoji: string) => Promise<void>;
    readonly onEdit: (messageId: string, content: string) => Promise<void>;
    readonly onDelete: (messageId: string) => Promise<void>;
    readonly onUserClick?: (userId: string, snapshot: UserProfileSnapshot) => void;
    readonly highlightedMessageId?: string | null;
}

const formatAuthorName = (message: Message): string => {
    const { firstName, lastName, email } = message.author;
    const fallback = email ?? 'Unknown user';
    const fullName = `${firstName ?? ''} ${lastName ?? ''}`.trim();
    return fullName || fallback;
};

const formatFileSize = (size: number): string => {
    if (size >= 1024 * 1024) {
        return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    }
    if (size >= 1024) {
        return `${Math.round(size / 1024)} KB`;
    }
    return `${size} B`;
};

const formatParentAuthorName = (parent: NonNullable<Message['parentMessage']>): string => {
    const { firstName, lastName } = parent.author;
    const fullName = `${firstName ?? ''} ${lastName ?? ''}`.trim();
    return fullName || 'Someone';
};

interface MessageAttachmentItemProps {
    readonly attachment: MessageAttachment;
}

const MessageAttachmentItem: React.FC<MessageAttachmentItemProps> = ({ attachment }) => {
    const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
    const [isPreviewLoading, setIsPreviewLoading] = React.useState(false);
    const [isDownloading, setIsDownloading] = React.useState(false);
    const isImage = Boolean(attachment.mimeType?.startsWith('image/'));

    const loadAttachmentBlob = React.useCallback(async (): Promise<Blob> => {
        const response = await axiosInstance.get<Blob>(`/attachments/${attachment.id}/download`, {
            responseType: 'blob'
        });
        return response.data;
    }, [attachment.id]);

    React.useEffect(() => {
        if (!isImage || previewUrl) {
            return;
        }

        let isCancelled = false;
        setIsPreviewLoading(true);

        void loadAttachmentBlob()
            .then(blob => {
                if (isCancelled) {
                    return;
                }
                const url = URL.createObjectURL(blob);
                setPreviewUrl(url);
            })
            .catch(error => {
                console.error('Failed to load attachment preview:', error);
            })
            .finally(() => {
                if (!isCancelled) {
                    setIsPreviewLoading(false);
                }
            });

        return () => {
            isCancelled = true;
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [isImage, loadAttachmentBlob, previewUrl]);

    React.useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    const handleDownload = React.useCallback(async (): Promise<void> => {
        try {
            setIsDownloading(true);
            let url = previewUrl;
            let revokeAfterUse = false;

            if (!url) {
                const blob = await loadAttachmentBlob();
                url = URL.createObjectURL(blob);
                revokeAfterUse = true;
            }

            if (!url) {
                toast.error('Unable to download file.');
                return;
            }

            const link = document.createElement('a');
            link.href = url;
            link.download = attachment.filename ?? 'attachment';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            if (revokeAfterUse && url) {
                URL.revokeObjectURL(url);
            }
        } catch (error) {
            console.error('Failed to download attachment:', error);
            toast.error('Failed to download file');
        } finally {
            setIsDownloading(false);
        }
    }, [attachment.filename, loadAttachmentBlob, previewUrl]);

    return (
        <Paper
            variant="outlined"
            sx={{
                p: 1.5,
                borderRadius: 2,
                bgcolor: theme => theme.palette.action.hover
            }}
        >
            <Stack spacing={1}>
                {isImage ? (
                    <Box
                        sx={{
                            width: '100%',
                            maxWidth: 320,
                            maxHeight: 240,
                            borderRadius: 1.5,
                            overflow: 'hidden',
                            position: 'relative'
                        }}
                    >
                        {previewUrl ? (
                            <Box
                                component="img"
                                src={previewUrl}
                                alt={attachment.filename}
                                sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                        ) : (
                            <Skeleton variant="rectangular" width="100%" height={180} />
                        )}
                    </Box>
                ) : (
                    <Stack direction="row" spacing={1} alignItems="center">
                        <DescriptionIcon fontSize="small" />
                        <Typography variant="body2" color="text.secondary">
                            {attachment.mimeType ?? 'File'}
                        </Typography>
                    </Stack>
                )}
                <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    justifyContent="space-between"
                >
                    <Box sx={{ overflow: 'hidden' }}>
                        <Typography
                            variant="body2"
                            sx={{
                                maxWidth: 260,
                                display: 'block',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                            }}
                            title={attachment.filename}
                        >
                            {attachment.filename ?? 'Attachment'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {formatFileSize(attachment.size)}
                        </Typography>
                    </Box>
                    <Tooltip title="Download">
                        <span>
                            <IconButton
                                size="small"
                                onClick={() => void handleDownload()}
                                disabled={isDownloading || isPreviewLoading}
                            >
                                <DownloadIcon fontSize="small" />
                            </IconButton>
                        </span>
                    </Tooltip>
                </Stack>
            </Stack>
        </Paper>
    );
};

export const MessageList: React.FC<MessageListProps> = ({
    messages,
    hasMore,
    isLoadingMore,
    isInitialLoading,
    onLoadMore,
    currentUserId,
    onReply,
    onToggleReaction,
    onEdit,
    onDelete,
    onUserClick,
    highlightedMessageId
}) => {
    const bottomRef = React.useRef<HTMLDivElement | null>(null);
    const previousCount = React.useRef<number>(0);
    const messageRefs = React.useRef(new Map<string, HTMLDivElement>());
    const [actionMenu, setActionMenu] = React.useState<{
        messageId: string;
        anchorEl: HTMLElement | null;
    } | null>(null);
    const [reactionMenu, setReactionMenu] = React.useState<{
        messageId: string;
        anchorEl: HTMLElement | null;
    } | null>(null);
    const [editingMessageId, setEditingMessageId] = React.useState<string | null>(null);
    const [editingContent, setEditingContent] = React.useState('');
    const [isSavingEdit, setIsSavingEdit] = React.useState(false);
    const [pendingReactionMessageId, setPendingReactionMessageId] = React.useState<string | null>(
        null
    );

    React.useEffect(() => {
        if (isLoadingMore) {
            previousCount.current = messages.length;
            return;
        }
        if (messages.length === 0) {
            previousCount.current = 0;
            return;
        }
        if (messages.length >= previousCount.current) {
            const behavior = previousCount.current === 0 ? 'auto' : 'smooth';
            bottomRef.current?.scrollIntoView({ behavior, block: 'end' });
        }
        previousCount.current = messages.length;
    }, [messages, isLoadingMore]);

    const handleOpenActionMenu = (messageId: string, anchorEl: HTMLElement): void => {
        setActionMenu({ messageId, anchorEl });
    };

    const handleCloseActionMenu = (): void => {
        setActionMenu(null);
    };

    const handleOpenReactionMenu = (messageId: string, anchorEl: HTMLElement): void => {
        setReactionMenu({ messageId, anchorEl });
    };

    const handleCloseReactionMenu = (): void => {
        setReactionMenu(null);
    };

    const startEditingMessage = (message: Message): void => {
        setEditingMessageId(message.id);
        setEditingContent(message.content);
        handleCloseActionMenu();
    };

    const cancelEditing = (): void => {
        setEditingMessageId(null);
        setEditingContent('');
    };

    const saveEdit = async (): Promise<void> => {
        if (!editingMessageId) {
            return;
        }
        const trimmed = editingContent.trim();
        if (!trimmed) {
            toast.error('Message cannot be empty');
            return;
        }
        setIsSavingEdit(true);
        try {
            await onEdit(editingMessageId, trimmed);
            cancelEditing();
        } catch (error) {
            console.error('Failed to edit message:', error);
        } finally {
            setIsSavingEdit(false);
        }
    };

    const deleteMessage = async (messageId: string): Promise<void> => {
        handleCloseActionMenu();
        const confirmed = window.confirm('Delete this message?');
        if (!confirmed) {
            return;
        }
        try {
            await onDelete(messageId);
        } catch (error) {
            console.error('Failed to delete message:', error);
        }
    };

    const handleToggleReaction = async (messageId: string, emoji: string): Promise<void> => {
        setPendingReactionMessageId(messageId);
        try {
            await onToggleReaction(messageId, emoji);
        } catch (error) {
            console.error('Failed to toggle reaction:', error);
        } finally {
            setPendingReactionMessageId(null);
            setReactionMenu(current => (current?.messageId === messageId ? null : current));
        }
    };

    const getMessageRef = React.useCallback(
        (messageId: string) => (node: HTMLDivElement | null) => {
            if (node) {
                messageRefs.current.set(messageId, node);
            } else {
                messageRefs.current.delete(messageId);
            }
        },
        []
    );

    React.useEffect(() => {
        if (!highlightedMessageId) {
            return;
        }
        const node = messageRefs.current.get(highlightedMessageId);
        if (node) {
            node.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [highlightedMessageId]);

    return (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2 }}>
                <Stack spacing={2}>
                    {hasMore ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                            <Button
                                variant="outlined"
                                size="small"
                                onClick={() => {
                                    void onLoadMore();
                                }}
                                disabled={isLoadingMore}
                            >
                                {isLoadingMore ? 'Loading…' : 'Load older messages'}
                            </Button>
                        </Box>
                    ) : null}
                    {isInitialLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                            <CircularProgress size={28} />
                        </Box>
                    ) : null}
                    {messages.map(message => {
                        const authorName = formatAuthorName(message);
                        const initials = authorName
                            .split(' ')
                            .map(part => part.charAt(0).toUpperCase())
                            .join('')
                            .slice(0, 2);
                        const timestamp = format(
                            new Date(message.createdAt),
                            'MMM d, yyyy • HH:mm'
                        );
                        const isOwnMessage = Boolean(
                            currentUserId && message.author.id === currentUserId
                        );
                        const isEditing = editingMessageId === message.id;
                        const isReactionPending = pendingReactionMessageId === message.id;
                        const userHasReacted = message.reactions.some(
                            reaction => reaction.userReacted
                        );
                        const isHighlighted = highlightedMessageId === message.id;
                        const authorSnapshot: UserProfileSnapshot = {
                            id: message.author.id,
                            firstName: message.author.firstName,
                            lastName: message.author.lastName,
                            email: message.author.email
                        };

                        return (
                            <Paper
                                key={message.id}
                                variant="outlined"
                                ref={getMessageRef(message.id)}
                                sx={{
                                    p: 2,
                                    transition:
                                        'background-color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease',
                                    backgroundColor: theme =>
                                        isHighlighted
                                            ? 'rgba(255, 215, 0, 0.16)'
                                            : theme.palette.background.paper,
                                    borderColor: theme =>
                                        isHighlighted ? '#FFC107' : theme.palette.divider,
                                    boxShadow: isHighlighted
                                        ? '0 0 0 2px rgba(255, 193, 7, 0.4)'
                                        : 'none'
                                }}
                            >
                                <Stack direction="row" spacing={2} alignItems="flex-start">
                                    <Avatar
                                        sx={{
                                            bgcolor: 'primary.main',
                                            color: 'primary.contrastText',
                                            cursor: onUserClick ? 'pointer' : 'default'
                                        }}
                                        onClick={() => {
                                            if (!onUserClick) {
                                                return;
                                            }
                                            onUserClick(message.author.id, authorSnapshot);
                                        }}
                                    >
                                        {initials || 'U'}
                                    </Avatar>
                                    <Box sx={{ flex: 1 }}>
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <Typography variant="subtitle2" fontWeight={600}>
                                                {authorName}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {timestamp}
                                            </Typography>
                                            {message.isEdited ? (
                                                <Typography
                                                    variant="caption"
                                                    color="text.secondary"
                                                >
                                                    (edited)
                                                </Typography>
                                            ) : null}
                                            <Box sx={{ flexGrow: 1 }} />
                                            {!message.isDeleted ? (
                                                <Tooltip title="Reply">
                                                    <span>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => onReply(message)}
                                                        >
                                                            <ReplyOutlinedIcon fontSize="small" />
                                                        </IconButton>
                                                    </span>
                                                </Tooltip>
                                            ) : null}
                                            {isOwnMessage ? (
                                                <Tooltip title="More actions">
                                                    <span>
                                                        <IconButton
                                                            size="small"
                                                            onClick={event =>
                                                                handleOpenActionMenu(
                                                                    message.id,
                                                                    event.currentTarget
                                                                )
                                                            }
                                                        >
                                                            <MoreVertIcon fontSize="small" />
                                                        </IconButton>
                                                    </span>
                                                </Tooltip>
                                            ) : null}
                                        </Stack>
                                        {message.parentMessage ? (
                                            <Paper
                                                variant="outlined"
                                                sx={{
                                                    mt: 1,
                                                    mb: 1,
                                                    p: 1,
                                                    pl: 1.5,
                                                    borderLeft: theme =>
                                                        `3px solid ${theme.palette.primary.main}`,
                                                    bgcolor: theme => theme.palette.action.hover
                                                }}
                                            >
                                                <Typography
                                                    variant="caption"
                                                    color="text.secondary"
                                                >
                                                    Replying to{' '}
                                                    {formatParentAuthorName(message.parentMessage)}
                                                </Typography>
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        display: '-webkit-box',
                                                        WebkitLineClamp: 2,
                                                        WebkitBoxOrient: 'vertical',
                                                        overflow: 'hidden',
                                                        mt: 0.5
                                                    }}
                                                >
                                                    {message.parentMessage.content}
                                                </Typography>
                                            </Paper>
                                        ) : null}
                                        {isEditing ? (
                                            <Stack spacing={1} sx={{ mt: 1 }}>
                                                <TextField
                                                    value={editingContent}
                                                    onChange={(
                                                        event: React.ChangeEvent<HTMLInputElement>
                                                    ) => setEditingContent(event.target.value)}
                                                    multiline
                                                    minRows={2}
                                                    maxRows={6}
                                                    fullWidth
                                                    autoFocus
                                                />
                                                <Stack direction="row" spacing={1}>
                                                    <Button
                                                        variant="contained"
                                                        size="small"
                                                        onClick={() => void saveEdit()}
                                                        disabled={isSavingEdit}
                                                    >
                                                        Save
                                                    </Button>
                                                    <Button
                                                        variant="text"
                                                        size="small"
                                                        onClick={cancelEditing}
                                                        disabled={isSavingEdit}
                                                    >
                                                        Cancel
                                                    </Button>
                                                </Stack>
                                            </Stack>
                                        ) : (
                                            <Typography
                                                variant="body1"
                                                sx={{
                                                    whiteSpace: 'pre-wrap',
                                                    color: message.isDeleted
                                                        ? 'text.disabled'
                                                        : 'text.primary',
                                                    mt: 1
                                                }}
                                            >
                                                {message.content}
                                            </Typography>
                                        )}
                                        {message.attachments.length > 0 ? (
                                            <Stack spacing={1} sx={{ mt: 1 }}>
                                                {message.attachments.map(attachment => (
                                                    <MessageAttachmentItem
                                                        key={attachment.id}
                                                        attachment={attachment}
                                                    />
                                                ))}
                                            </Stack>
                                        ) : null}
                                        <Stack
                                            direction="row"
                                            spacing={1}
                                            alignItems="center"
                                            sx={{ mt: 1 }}
                                        >
                                            {message.reactions.map(reaction => {
                                                const uniqueNames = reaction.users.reduce<
                                                    { id: string; label: string }[]
                                                >((accumulator, user) => {
                                                    const trimmedLabel = `${user.firstName ?? ''} ${
                                                        user.lastName ?? ''
                                                    }`
                                                        .trim()
                                                        .replace(/\s+/g, ' ');
                                                    const label =
                                                        trimmedLabel !== ''
                                                            ? trimmedLabel
                                                            : 'Someone';
                                                    const alreadyIncluded = accumulator.some(
                                                        entry => entry.id === user.id
                                                    );
                                                    if (!alreadyIncluded) {
                                                        accumulator.push({ id: user.id, label });
                                                    }
                                                    return accumulator;
                                                }, []);

                                                const tooltipTitle = uniqueNames.length
                                                    ? `Reacted by: ${uniqueNames
                                                          .map(entry => entry.label)
                                                          .join(', ')}`
                                                    : 'No reactions yet';

                                                return (
                                                    <Tooltip
                                                        key={`${reaction.emoji}-${reaction.id}`}
                                                        title={tooltipTitle}
                                                        placement="top"
                                                        arrow
                                                    >
                                                        <span>
                                                            <Chip
                                                                label={`${reaction.emoji} ${reaction.count}`}
                                                                color={
                                                                    reaction.userReacted
                                                                        ? 'primary'
                                                                        : 'default'
                                                                }
                                                                variant={
                                                                    reaction.userReacted
                                                                        ? 'filled'
                                                                        : 'outlined'
                                                                }
                                                                size="small"
                                                                onClick={() =>
                                                                    void handleToggleReaction(
                                                                        message.id,
                                                                        reaction.emoji
                                                                    )
                                                                }
                                                                disabled={isReactionPending}
                                                            />
                                                        </span>
                                                    </Tooltip>
                                                );
                                            })}
                                            {!message.isDeleted && !userHasReacted ? (
                                                <Tooltip title="Add reaction">
                                                    <span>
                                                        <IconButton
                                                            size="small"
                                                            onClick={event =>
                                                                handleOpenReactionMenu(
                                                                    message.id,
                                                                    event.currentTarget
                                                                )
                                                            }
                                                            disabled={isReactionPending}
                                                        >
                                                            <InsertEmoticonIcon fontSize="small" />
                                                        </IconButton>
                                                    </span>
                                                </Tooltip>
                                            ) : null}
                                        </Stack>
                                    </Box>
                                </Stack>
                            </Paper>
                        );
                    })}
                </Stack>
                <Box ref={bottomRef} />
            </Box>

            <Menu
                anchorEl={actionMenu?.anchorEl ?? null}
                open={Boolean(actionMenu)}
                onClose={handleCloseActionMenu}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <MenuItem
                    onClick={() => {
                        if (!actionMenu) {
                            return;
                        }
                        const message = messages.find(m => m.id === actionMenu.messageId);
                        if (message) {
                            startEditingMessage(message);
                        }
                    }}
                >
                    <EditOutlinedIcon fontSize="small" sx={{ mr: 1 }} /> Edit message
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        if (!actionMenu) {
                            return;
                        }
                        void deleteMessage(actionMenu.messageId);
                    }}
                >
                    <DeleteOutlineIcon fontSize="small" sx={{ mr: 1 }} /> Delete message
                </MenuItem>
            </Menu>

            <Popover
                open={Boolean(reactionMenu)}
                anchorEl={reactionMenu?.anchorEl ?? null}
                onClose={handleCloseReactionMenu}
                anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
                transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            >
                <Box sx={{ p: 1 }}>
                    <EmojiPicker
                        onSelect={emoji => {
                            const targetMessageId = reactionMenu?.messageId;
                            handleCloseReactionMenu();
                            if (!targetMessageId) {
                                return;
                            }
                            void handleToggleReaction(targetMessageId, emoji);
                        }}
                    />
                </Box>
            </Popover>
        </Box>
    );
};
