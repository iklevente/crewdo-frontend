export type NotificationType =
    | 'task_assigned'
    | 'task_completed'
    | 'comment_added'
    | 'project_status_changed'
    | 'message_received'
    | 'message_reply'
    | 'call_scheduled'
    | 'incoming_call';

interface NotificationOwner {
    readonly id: string;
    readonly firstName?: string | null;
    readonly lastName?: string | null;
    readonly email?: string | null;
}

export interface NotificationItem {
    readonly id: string;
    readonly title: string;
    readonly message: string;
    readonly type: NotificationType;
    readonly isRead: boolean;
    readonly relatedEntityId: string | null;
    readonly relatedEntityType: string | null;
    readonly createdAt: string;
    readonly user: NotificationOwner;
}

export interface NotificationQueryState {
    readonly type: NotificationType | 'all';
    readonly status: 'all' | 'read' | 'unread';
    readonly page: number;
    readonly pageSize: number;
}

export interface NotificationCollection {
    readonly notifications: NotificationItem[];
    readonly total: number;
    readonly unreadCount: number;
}
