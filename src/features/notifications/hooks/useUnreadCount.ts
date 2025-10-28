import { useQuery } from '@tanstack/react-query';
import { apiClients } from 'services/api-clients';

export const UNREAD_COUNT_QUERY_KEY = ['notifications', 'unread-count'] as const;

interface UnreadCountResponse {
    readonly count: number;
}

const fetchUnreadCount = async (): Promise<number> => {
    try {
        const response =
            (await apiClients.notifications.notificationControllerGetMyUnreadCount()) as unknown as {
                data: UnreadCountResponse;
            };
        const count = response.data?.count ?? 0;
        console.log('[useUnreadCount] Fetched unread count:', count);
        return count;
    } catch (error) {
        console.warn('[useUnreadCount] Failed to fetch unread count', error);
        return 0;
    }
};

export const useUnreadCount = (): {
    readonly unreadCount: number;
    readonly isLoading: boolean;
} => {
    const { data, isLoading } = useQuery({
        queryKey: UNREAD_COUNT_QUERY_KEY,
        queryFn: fetchUnreadCount,
        staleTime: 30_000,
        refetchInterval: 60_000 // Refetch every minute as fallback
    });

    return {
        unreadCount: data ?? 0,
        isLoading
    };
};
