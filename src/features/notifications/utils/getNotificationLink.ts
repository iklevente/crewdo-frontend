import type { NotificationItem, NotificationType } from '../types/notification';

/**
 * Generates the navigation path for a notification based on its type and related entity.
 * Returns null if the notification is not clickable or lacks required information.
 */
export const getNotificationLink = (notification: NotificationItem): string | null => {
    const { type, relatedEntityId, relatedEntityType } = notification;

    if (!relatedEntityId || !relatedEntityType) {
        return null;
    }

    switch (relatedEntityType) {
        case 'task':
            return '/app/projects';
        case 'project':
            return '/app/projects';
        case 'message':
            // Always go to main conversations page
            return '/app/conversations';
        case 'call':
            return '/app/calls';
        default:
            return getNotificationLinkByType(type);
    }
};

/**
 * Fallback function to determine navigation path based on notification type alone.
 */
const getNotificationLinkByType = (type: NotificationType): string | null => {
    switch (type) {
        case 'task_assigned':
        case 'task_completed':
            return '/app/projects';

        case 'comment_added':
            return '/app/projects';

        case 'project_status_changed':
            return '/app/projects';

        case 'message_received':
        case 'message_reply':
            return '/app/conversations';

        case 'call_scheduled':
        case 'incoming_call':
            return '/app/calls';

        default:
            return null;
    }
};
