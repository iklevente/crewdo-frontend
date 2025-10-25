import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { apiClients } from 'services/api-clients';
import { NOTIFICATIONS_QUERY_KEY } from './useNotifications';

interface ToggleReadVariables {
    readonly id: string;
    readonly isRead: boolean;
}

interface DeleteNotificationVariables {
    readonly id: string;
}

export const useNotificationMutations = (): {
    readonly toggleRead: (variables: ToggleReadVariables) => Promise<void>;
    readonly markAllAsRead: () => Promise<void>;
    readonly deleteNotification: (variables: DeleteNotificationVariables) => Promise<void>;
    readonly isMarkAllPending: boolean;
} => {
    const queryClient = useQueryClient();

    const invalidateNotifications = useCallback(async () => {
        await queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
    }, [queryClient]);

    const toggleReadMutation = useMutation<void, unknown, ToggleReadVariables>({
        mutationFn: async variables => {
            await apiClients.notifications.notificationControllerUpdate(variables.id, {
                isRead: variables.isRead
            });
        },
        onError: error => {
            console.warn('Failed to update notification read state', error);
            toast.error('Could not update the notification. Try again.');
        },
        onSuccess: async (_data, variables) => {
            await invalidateNotifications();
            toast.success(
                variables.isRead ? 'Notification marked as read' : 'Notification marked as unread'
            );
        }
    });

    const markAllMutation = useMutation({
        mutationFn: async () => {
            await apiClients.notifications.notificationControllerMarkMyNotificationsAsRead();
        },
        onError: error => {
            console.warn('Failed to mark notifications as read', error);
            toast.error('Could not mark notifications as read. Please retry.');
        },
        onSuccess: async () => {
            await invalidateNotifications();
            toast.success('All notifications marked as read');
        }
    });

    const deleteMutation = useMutation<void, unknown, DeleteNotificationVariables>({
        mutationFn: async variables => {
            await apiClients.notifications.notificationControllerDeleteNotification(variables.id);
        },
        onError: error => {
            console.warn('Failed to delete notification', error);
            toast.error('Unable to delete the notification.');
        },
        onSuccess: async () => {
            await invalidateNotifications();
            toast.success('Notification deleted');
        }
    });

    const toggleRead = useCallback(
        async (variables: ToggleReadVariables): Promise<void> => {
            await toggleReadMutation.mutateAsync(variables);
        },
        [toggleReadMutation]
    );

    const markAllAsRead = useCallback(async (): Promise<void> => {
        await markAllMutation.mutateAsync();
    }, [markAllMutation]);

    const deleteNotification = useCallback(
        async (variables: DeleteNotificationVariables): Promise<void> => {
            await deleteMutation.mutateAsync(variables);
        },
        [deleteMutation]
    );

    return {
        toggleRead,
        markAllAsRead,
        deleteNotification,
        isMarkAllPending: markAllMutation.isPending
    };
};
