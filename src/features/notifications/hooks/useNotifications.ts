import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClients } from 'services/api-clients';
import type { NotificationControllerGetMyNotificationsTypeEnum } from 'api/api/notifications-api';
import type {
    NotificationCollection,
    NotificationItem,
    NotificationQueryState,
    NotificationType
} from '../types/notification';

export const NOTIFICATIONS_QUERY_KEY = ['notifications', 'me'] as const;

interface RawNotificationOwner {
    readonly id?: string;
    readonly firstName?: string | null;
    readonly lastName?: string | null;
    readonly email?: string | null;
}

interface RawNotification {
    readonly id?: string;
    readonly title?: string;
    readonly message?: string;
    readonly type?: string;
    readonly isRead?: boolean;
    readonly relatedEntityId?: string | null;
    readonly relatedEntityType?: string | null;
    readonly createdAt?: string;
    readonly user?: RawNotificationOwner;
}

interface RawNotificationResponse {
    readonly notifications?: RawNotification[];
    readonly total?: number;
    readonly unreadCount?: number;
}

const isNotificationType = (value: string): value is NotificationType => {
    return (
        value === 'task_assigned' ||
        value === 'task_completed' ||
        value === 'comment_added' ||
        value === 'project_status_changed' ||
        value === 'message_received' ||
        value === 'message_reply' ||
        value === 'call_scheduled' ||
        value === 'incoming_call'
    );
};

const normalizeNotification = (raw: RawNotification): NotificationItem | null => {
    if (!raw?.id || !raw.title || !raw.message || !raw.type || !raw.createdAt || !raw.user?.id) {
        return null;
    }

    const type = raw.type.toLowerCase();
    if (!isNotificationType(type)) {
        return null;
    }

    return {
        id: raw.id,
        title: raw.title,
        message: raw.message,
        type,
        isRead: Boolean(raw.isRead),
        relatedEntityId: raw.relatedEntityId ?? null,
        relatedEntityType: raw.relatedEntityType ?? null,
        createdAt: raw.createdAt,
        user: {
            id: raw.user.id,
            firstName: raw.user.firstName ?? null,
            lastName: raw.user.lastName ?? null,
            email: raw.user.email ?? null
        }
    };
};

const emptyCollection: NotificationCollection = {
    notifications: [],
    total: 0,
    unreadCount: 0
};

const sanitizeFilters = (filters: NotificationQueryState): NotificationQueryState => {
    const page = Math.max(1, Math.trunc(filters.page || 1));
    const pageSize = Math.min(100, Math.max(5, Math.trunc(filters.pageSize || 20)));
    const status =
        filters.status === 'read' || filters.status === 'unread' ? filters.status : 'all';
    const type = filters.type ?? 'all';

    return {
        type,
        status,
        page,
        pageSize
    };
};

const buildQueryParams = (filters: NotificationQueryState): Record<string, unknown> => {
    const params: Record<string, unknown> = {
        limit: filters.pageSize,
        offset: (filters.page - 1) * filters.pageSize
    };

    if (filters.type !== 'all') {
        params.type = filters.type;
    }

    if (filters.status === 'read') {
        params.isRead = true;
    }

    if (filters.status === 'unread') {
        params.isRead = false;
    }

    return params;
};

const fetchNotifications = async (
    filters: NotificationQueryState
): Promise<NotificationCollection> => {
    try {
        const sanitized = sanitizeFilters(filters);
        const params = buildQueryParams(sanitized);
        const response = (await apiClients.notifications.notificationControllerGetMyNotifications(
            params.type as NotificationControllerGetMyNotificationsTypeEnum | undefined,
            params.isRead as boolean | undefined,
            params.limit as number | undefined,
            params.offset as number | undefined
        )) as unknown as { data: RawNotificationResponse };

        const payload = response.data ?? {};
        const items = Array.isArray(payload.notifications)
            ? payload.notifications
                  .map((item: RawNotification) => normalizeNotification(item))
                  .filter(
                      (item: NotificationItem | null): item is NotificationItem => item !== null
                  )
            : [];

        return {
            notifications: items,
            total: typeof payload.total === 'number' ? payload.total : items.length,
            unreadCount:
                typeof payload.unreadCount === 'number'
                    ? payload.unreadCount
                    : items.filter((n: NotificationItem) => !n.isRead).length
        };
    } catch (error) {
        console.warn('Failed to load notifications', error);
        return emptyCollection;
    }
};

export const useNotifications = (
    filters: NotificationQueryState
): NotificationCollection & {
    readonly isLoading: boolean;
    readonly isFetching: boolean;
    readonly isError: boolean;
    readonly resolvedFilters: NotificationQueryState;
} => {
    const sanitizedFilters = useMemo(() => sanitizeFilters(filters), [filters]);

    const queryResult = useQuery<NotificationCollection>({
        queryKey: [...NOTIFICATIONS_QUERY_KEY, sanitizedFilters],
        queryFn: () => fetchNotifications(sanitizedFilters),
        staleTime: 30_000
    });

    const data = queryResult.data ?? emptyCollection;

    return {
        notifications: data.notifications,
        total: data.total,
        unreadCount: data.unreadCount,
        isLoading: queryResult.isLoading,
        isFetching: queryResult.isFetching,
        isError: queryResult.isError,
        resolvedFilters: sanitizedFilters
    };
};
