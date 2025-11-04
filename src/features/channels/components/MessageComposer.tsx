import React from 'react';
import {
    Box,
    Chip,
    IconButton,
    Paper,
    Popover,
    Stack,
    TextField,
    Tooltip,
    Typography
} from '@mui/material';
import LoadingButton from '@mui/lab/LoadingButton';
import AttachFileIcon from '@mui/icons-material/AttachFileOutlined';
import InsertEmoticonIcon from '@mui/icons-material/InsertEmoticon';
import CloseIcon from '@mui/icons-material/Close';
import toast from 'react-hot-toast';
import { EmojiPicker } from 'features/messages/components/EmojiPicker';

interface MessageComposerProps {
    readonly onSend: (payload: {
        content: string;
        attachments: File[];
        parentMessageId?: string;
    }) => Promise<void>;
    readonly isSending: boolean;
    readonly replyTo?: {
        messageId: string;
        authorName: string;
        snippet: string;
    } | null;
    readonly onCancelReply?: () => void;
}

interface PendingAttachment {
    readonly id: string;
    readonly file: File;
}

const MAX_ATTACHMENTS = 10;
const createAttachmentId = (): string => {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        return crypto.randomUUID();
    }
    return Math.random().toString(36).slice(2);
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

export const MessageComposer: React.FC<MessageComposerProps> = ({
    onSend,
    isSending,
    replyTo,
    onCancelReply
}) => {
    const [value, setValue] = React.useState('');
    const [attachments, setAttachments] = React.useState<PendingAttachment[]>([]);
    const [emojiAnchor, setEmojiAnchor] = React.useState<HTMLElement | null>(null);
    const [isDragging, setIsDragging] = React.useState(false);
    const fileInputRef = React.useRef<HTMLInputElement | null>(null);

    const addFiles = React.useCallback((input: FileList | File[]): void => {
        const incomingFiles = Array.from(input).filter(file => file.size > 0);
        if (incomingFiles.length === 0) {
            return;
        }

        setAttachments(prev => {
            const existingKeys = new Set(
                prev.map(item => `${item.file.name}-${item.file.size}-${item.file.lastModified}`)
            );
            const merged = [...prev];

            for (const file of incomingFiles) {
                const key = `${file.name}-${file.size}-${file.lastModified}`;
                if (existingKeys.has(key)) {
                    continue;
                }
                if (merged.length >= MAX_ATTACHMENTS) {
                    toast.error(`You can attach up to ${MAX_ATTACHMENTS} files per message.`);
                    break;
                }
                merged.push({ id: createAttachmentId(), file });
                existingKeys.add(key);
            }

            return merged;
        });
    }, []);

    const handleSubmit = React.useCallback(async (): Promise<void> => {
        const trimmed = value.trim();
        const hasText = trimmed.length > 0;
        const hasAttachments = attachments.length > 0;
        if (!hasText && !hasAttachments) {
            toast.error('Message cannot be empty');
            return;
        }
        if (isSending) {
            return;
        }

        try {
            await onSend({
                content: hasText ? trimmed : '',
                attachments: attachments.map(item => item.file),
                parentMessageId: replyTo?.messageId
            });
            setValue('');
            setAttachments([]);
            setEmojiAnchor(null);
            onCancelReply?.();
        } catch {
            return;
        }
    }, [attachments, isSending, onCancelReply, onSend, replyTo?.messageId, value]);

    const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
        event.preventDefault();
        void handleSubmit();
    };

    const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
        if (event.target.files) {
            addFiles(event.target.files);
            event.target.value = '';
        }
    };

    const handleRemoveAttachment = (id: string): void => {
        setAttachments(prev => prev.filter(item => item.id !== id));
    };

    const handleEmojiToggle = (event: React.MouseEvent<HTMLElement>): void => {
        setEmojiAnchor(current => (current ? null : event.currentTarget));
    };

    const handleEmojiSelect = (emoji: string): void => {
        setValue(prev => `${prev}${emoji}`);
        setEmojiAnchor(null);
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
        if (
            event.key !== 'Enter' ||
            event.shiftKey ||
            event.altKey ||
            event.metaKey ||
            event.ctrlKey
        ) {
            return;
        }
        const { nativeEvent } = event;
        if (nativeEvent.isComposing) {
            return;
        }
        event.preventDefault();
        void handleSubmit();
    };

    const handleDragEnter = (event: React.DragEvent<HTMLDivElement>): void => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(true);
    };

    const handleDragOver = (event: React.DragEvent<HTMLDivElement>): void => {
        event.preventDefault();
        event.stopPropagation();
        if (!isDragging) {
            setIsDragging(true);
        }
    };

    const handleDragLeave = (event: React.DragEvent<HTMLDivElement>): void => {
        event.preventDefault();
        event.stopPropagation();
        if (event.currentTarget.contains(event.relatedTarget as Node)) {
            return;
        }
        setIsDragging(false);
    };

    const handleDrop = (event: React.DragEvent<HTMLDivElement>): void => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(false);
        if (event.dataTransfer?.files?.length) {
            addFiles(event.dataTransfer.files);
        }
    };

    const emojiPickerOpen = Boolean(emojiAnchor);
    const trimmedValue = value.trim();
    const canSend = trimmedValue.length > 0 || attachments.length > 0;

    return (
        <Paper
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            sx={{
                p: 2,
                position: 'relative',
                borderStyle: isDragging ? 'dashed' : 'solid',
                borderWidth: 1,
                borderColor: theme =>
                    isDragging ? theme.palette.primary.main : theme.palette.divider,
                bgcolor: isDragging ? 'action.hover' : 'background.paper'
            }}
        >
            {isDragging ? (
                <Box
                    sx={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'action.hover',
                        color: 'primary.main',
                        borderRadius: theme => theme.shape.borderRadius,
                        pointerEvents: 'none'
                    }}
                >
                    <Typography variant="body2">Drop files to attach</Typography>
                </Box>
            ) : null}
            <Box
                component="form"
                onSubmit={handleFormSubmit}
                sx={{ opacity: isDragging ? 0.4 : 1 }}
            >
                <Stack spacing={1.5}>
                    {replyTo ? (
                        <Paper
                            variant="outlined"
                            sx={{
                                p: 1.5,
                                bgcolor: theme => theme.palette.action.hover,
                                borderStyle: 'dashed'
                            }}
                        >
                            <Stack direction="row" spacing={1} alignItems="flex-start">
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="caption" color="text.secondary">
                                        Replying to {replyTo.authorName}
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            mt: 0.5,
                                            display: '-webkit-box',
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical',
                                            overflow: 'hidden'
                                        }}
                                    >
                                        {replyTo.snippet}
                                    </Typography>
                                </Box>
                                <Tooltip title="Cancel reply">
                                    <IconButton size="small" onClick={onCancelReply}>
                                        <CloseIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </Stack>
                        </Paper>
                    ) : null}
                    {attachments.length > 0 ? (
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            {attachments.map(item => (
                                <Chip
                                    key={item.id}
                                    label={`${item.file.name} (${formatFileSize(item.file.size)})`}
                                    onDelete={() => handleRemoveAttachment(item.id)}
                                    color="default"
                                    variant="outlined"
                                />
                            ))}
                        </Stack>
                    ) : null}
                    <Stack direction="row" spacing={1.5} alignItems="flex-end">
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ pb: 0.5 }}>
                            <input
                                ref={fileInputRef}
                                type="file"
                                hidden
                                multiple
                                onChange={handleFileInputChange}
                                disabled={isSending}
                            />
                            <Tooltip title="Attach files">
                                <span>
                                    <IconButton
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isSending}
                                        size="small"
                                    >
                                        <AttachFileIcon />
                                    </IconButton>
                                </span>
                            </Tooltip>
                            <Tooltip title="Add emoji">
                                <span>
                                    <IconButton
                                        onClick={handleEmojiToggle}
                                        disabled={isSending}
                                        size="small"
                                    >
                                        <InsertEmoticonIcon />
                                    </IconButton>
                                </span>
                            </Tooltip>
                        </Stack>
                        <TextField
                            value={value}
                            onChange={event => setValue(event.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Write a message…"
                            multiline
                            minRows={2}
                            maxRows={6}
                            fullWidth
                        />
                        <LoadingButton
                            variant="contained"
                            type="submit"
                            loading={isSending}
                            disabled={!canSend || isSending}
                        >
                            Send
                        </LoadingButton>
                    </Stack>
                </Stack>
            </Box>
            <Popover
                open={emojiPickerOpen}
                anchorEl={emojiAnchor}
                onClose={() => setEmojiAnchor(null)}
                anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
                transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            >
                <Box sx={{ p: 1 }}>
                    <EmojiPicker onSelect={handleEmojiSelect} autoFocus />
                </Box>
            </Popover>
        </Paper>
    );
};
