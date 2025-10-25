import React from 'react';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    LinearProgress,
    Pagination,
    Paper,
    Stack,
    Typography
} from '@mui/material';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailReadOutlined';
import RefreshIcon from '@mui/icons-material/RefreshOutlined';
import { NotificationFilters } from '../components/NotificationFilters';
import { NotificationListItem } from '../components/NotificationListItem';
import { useNotificationMutations } from '../hooks/useNotificationMutations';
import { useNotifications } from '../hooks/useNotifications';
import type { NotificationQueryState } from '../types/notification';

const DEFAULT_FILTERS: NotificationQueryState = {
    type: 'all',
    status: 'all',
    page: 1,
    pageSize: 15
};

export const NotificationsPage: React.FC = () => {
    const [filters, setFilters] = React.useState<NotificationQueryState>(DEFAULT_FILTERS);

    const {
        notifications,
        total,
        unreadCount,
        isLoading,
        isFetching,
        isError,
        refetch,
        resolvedFilters
    } = useNotifications(filters);

    const { toggleRead, deleteNotification, markAllAsRead, isMarkAllPending } =
        useNotificationMutations();

    const totalPages = React.useMemo(() => {
        if (resolvedFilters.pageSize <= 0) {
            return 1;
        }
        return Math.max(1, Math.ceil(total / resolvedFilters.pageSize));
    }, [total, resolvedFilters.pageSize]);

    const handleFiltersChange = React.useCallback(
        (next: Pick<NotificationQueryState, 'type' | 'status'>) => {
            setFilters(prev => ({ ...prev, ...next, page: 1 }));
        },
        []
    );

    const handlePageChange = (_event: React.ChangeEvent<unknown>, page: number): void => {
        setFilters(prev => ({ ...prev, page }));
    };

    const handleToggleRead = React.useCallback(
        (id: string, isRead: boolean) => toggleRead({ id, isRead }),
        [toggleRead]
    );

    const handleDelete = React.useCallback(
        (id: string) => deleteNotification({ id }),
        [deleteNotification]
    );

    const handleMarkAllAsRead = React.useCallback(() => markAllAsRead(), [markAllAsRead]);

    const isEmptyState = !isLoading && notifications.length === 0;

    return (
        <Box sx={{ px: { xs: 2, md: 4 }, py: 3 }}>
            <Stack spacing={3}>
                <Stack
                    direction={{ xs: 'column', md: 'row' }}
                    spacing={2.5}
                    alignItems={{ xs: 'flex-start', md: 'center' }}
                    justifyContent="space-between"
                >
                    <Stack spacing={0.5}>
                        <Typography variant="h4" fontWeight={600}>
                            Notifications
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Keep track of updates across tasks, projects, messages, and calls.
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {unreadCount > 0
                                ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}`
                                : 'You are all caught up'}
                        </Typography>
                    </Stack>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <Button
                            variant="outlined"
                            startIcon={<RefreshIcon />}
                            onClick={() => {
                                void refetch();
                            }}
                            disabled={isFetching}
                        >
                            Refresh
                        </Button>
                        <Button
                            variant="contained"
                            startIcon={<MarkEmailReadIcon />}
                            onClick={() => {
                                void handleMarkAllAsRead();
                            }}
                            disabled={unreadCount === 0 || isMarkAllPending}
                        >
                            Mark all as read
                        </Button>
                    </Stack>
                </Stack>

                <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 } }}>
                    <NotificationFilters
                        filters={{ type: filters.type, status: filters.status }}
                        onFiltersChange={handleFiltersChange}
                        disabled={isLoading || isFetching}
                    />
                </Paper>

                {isFetching && !isLoading ? <LinearProgress /> : null}

                {isLoading ? (
                    <Stack alignItems="center" justifyContent="center" sx={{ py: 6 }}>
                        <CircularProgress />
                    </Stack>
                ) : isError ? (
                    <Alert
                        severity="error"
                        action={
                            <Button color="inherit" size="small" onClick={() => void refetch()}>
                                Retry
                            </Button>
                        }
                    >
                        We could not load your notifications. Please try again shortly.
                    </Alert>
                ) : isEmptyState ? (
                    <Paper variant="outlined" sx={{ p: { xs: 4, md: 6 }, textAlign: 'center' }}>
                        <Stack spacing={1.5} alignItems="center">
                            <Typography variant="h6" fontWeight={600}>
                                Nothing to see yet
                            </Typography>
                            <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ maxWidth: 420 }}
                            >
                                As soon as teammates assign tasks, comment on your work, or invite
                                you to calls, updates will show up here.
                            </Typography>
                            <Button
                                variant="outlined"
                                startIcon={<RefreshIcon />}
                                onClick={() => {
                                    void refetch();
                                }}
                                disabled={isFetching}
                            >
                                Refresh now
                            </Button>
                        </Stack>
                    </Paper>
                ) : (
                    <Stack spacing={2.5}>
                        {notifications.map(notification => (
                            <NotificationListItem
                                key={notification.id}
                                notification={notification}
                                onToggleRead={handleToggleRead}
                                onDelete={handleDelete}
                            />
                        ))}
                        {totalPages > 1 ? (
                            <Stack direction="row" justifyContent="center">
                                <Pagination
                                    count={totalPages}
                                    page={resolvedFilters.page}
                                    onChange={handlePageChange}
                                    color="primary"
                                />
                            </Stack>
                        ) : null}
                    </Stack>
                )}
            </Stack>
        </Box>
    );
};
