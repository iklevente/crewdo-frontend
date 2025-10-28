import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Avatar,
    Chip,
    CircularProgress,
    IconButton,
    Paper,
    Stack,
    Tooltip,
    Typography,
    alpha,
    useTheme
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircleOutlined';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineOutlined';
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';
import type { NotificationItem } from '../types/notification';
import { formatNotificationType, getNotificationMeta } from '../utils/notificationMeta';
import { getNotificationLink } from '../utils/getNotificationLink';

interface NotificationListItemProps {
    readonly notification: NotificationItem;
    readonly onToggleRead: (id: string, isRead: boolean) => Promise<void>;
    readonly onDelete: (id: string) => Promise<void>;
}

export const NotificationListItem: React.FC<NotificationListItemProps> = ({
    notification,
    onToggleRead,
    onDelete
}) => {
    const theme = useTheme();
    const navigate = useNavigate();
    const [isToggling, setIsToggling] = React.useState(false);
    const [isDeleting, setIsDeleting] = React.useState(false);

    const meta = React.useMemo(() => getNotificationMeta(notification.type), [notification.type]);
    const Icon = meta.icon;
    const paletteColor = theme.palette[meta.paletteKey];
    const accentColor = paletteColor?.main ?? theme.palette.primary.main;
    const isUnread = !notification.isRead;
    const notificationLink = React.useMemo(() => getNotificationLink(notification), [notification]);
    const isClickable = Boolean(notificationLink);

    const createdAtText = React.useMemo(() => {
        if (!notification.createdAt) {
            return null;
        }
        const date = new Date(notification.createdAt);
        if (Number.isNaN(date.getTime())) {
            return null;
        }
        return formatDistanceToNow(date, { addSuffix: true });
    }, [notification.createdAt]);

    const handleToggleRead = async (): Promise<void> => {
        if (isDeleting) {
            return;
        }
        setIsToggling(true);
        try {
            await onToggleRead(notification.id, !notification.isRead);
        } finally {
            setIsToggling(false);
        }
    };

    const handleDelete = async (): Promise<void> => {
        setIsDeleting(true);
        try {
            await onDelete(notification.id);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleClick = (): void => {
        if (!notificationLink) {
            return;
        }
        // Mark as read when clicking
        if (!notification.isRead) {
            void onToggleRead(notification.id, true);
        }
        navigate(notificationLink);
    };

    return (
        <Paper
            variant="outlined"
            onClick={isClickable && !isDeleting && !isToggling ? handleClick : undefined}
            sx={{
                p: { xs: 2, sm: 2.5 },
                display: 'flex',
                gap: 2,
                alignItems: 'flex-start',
                borderLeft: theme => `4px solid ${isUnread ? accentColor : theme.palette.divider}`,
                bgcolor: isUnread ? alpha(accentColor, 0.06) : 'background.paper',
                cursor: isClickable ? 'pointer' : 'default',
                transition: 'all 0.2s ease-in-out',
                '&:hover': isClickable
                    ? {
                          bgcolor: isUnread
                              ? alpha(accentColor, 0.12)
                              : theme => alpha(theme.palette.action.hover, 0.04),
                          transform: 'translateY(-2px)',
                          boxShadow: 2
                      }
                    : {}
            }}
        >
            <Avatar
                sx={{
                    bgcolor: alpha(accentColor, 0.18),
                    color: accentColor,
                    width: 48,
                    height: 48
                }}
            >
                <Icon fontSize="medium" />
            </Avatar>
            <Stack spacing={1} sx={{ flexGrow: 1 }}>
                <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1}
                    alignItems={{ xs: 'flex-start', sm: 'center' }}
                    justifyContent="space-between"
                >
                    <Stack spacing={0.5} sx={{ flex: 1 }}>
                        <Typography variant="subtitle1" fontWeight={600} sx={{ lineHeight: 1.2 }}>
                            {notification.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {notification.message}
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                            <Chip
                                label={formatNotificationType(notification.type)}
                                color={meta.paletteKey}
                                size="small"
                            />
                            {createdAtText ? (
                                <Typography variant="caption" color="text.secondary">
                                    {createdAtText}
                                </Typography>
                            ) : null}
                            {notification.relatedEntityType ? (
                                <Typography variant="caption" color="text.secondary">
                                    {notification.relatedEntityType}
                                </Typography>
                            ) : null}
                        </Stack>
                    </Stack>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <Tooltip title={notification.isRead ? 'Mark as unread' : 'Mark as read'}>
                            <span>
                                <IconButton
                                    size="small"
                                    onClick={e => {
                                        e.stopPropagation();
                                        void handleToggleRead();
                                    }}
                                    disabled={isToggling || isDeleting}
                                    aria-label={
                                        notification.isRead
                                            ? 'mark notification as unread'
                                            : 'mark notification as read'
                                    }
                                >
                                    {isToggling ? (
                                        <CircularProgress size={20} />
                                    ) : notification.isRead ? (
                                        <CheckCircleIcon fontSize="small" />
                                    ) : (
                                        <RadioButtonUncheckedIcon fontSize="small" />
                                    )}
                                </IconButton>
                            </span>
                        </Tooltip>
                        <Tooltip title="Delete notification">
                            <span>
                                <IconButton
                                    size="small"
                                    color="error"
                                    onClick={e => {
                                        e.stopPropagation();
                                        void handleDelete();
                                    }}
                                    disabled={isDeleting}
                                    aria-label="delete notification"
                                >
                                    {isDeleting ? (
                                        <CircularProgress size={20} color="inherit" />
                                    ) : (
                                        <DeleteOutlineIcon fontSize="small" />
                                    )}
                                </IconButton>
                            </span>
                        </Tooltip>
                    </Stack>
                </Stack>
            </Stack>
        </Paper>
    );
};
