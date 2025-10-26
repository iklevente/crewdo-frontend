import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import React from 'react';
import type { MessageResponseDto } from 'api/models/message-response-dto';
import { apiClients } from 'services/api-clients';
import type { Message, MessageHistoryResponse } from 'features/messages/types/message';
import { mapMessageResponse } from 'features/messages/types/message';

export const CHANNEL_MESSAGES_QUERY_KEY = (channelId: string): [string, string] => [
    'channel-messages',
    channelId
];

interface RawMessageHistoryResponse {
    readonly messages: MessageResponseDto[];
    readonly hasMore: boolean;
    readonly nextCursor?: string;
}

interface UseChannelMessagesResult {
    readonly messages: Message[];
    readonly isInitialLoading: boolean;
    readonly fetchNextPage: () => Promise<unknown>;
    readonly hasNextPage: boolean;
    readonly isFetchingNextPage: boolean;
    readonly refetch: () => Promise<unknown>;
    readonly invalidate: () => Promise<void>;
}

const PAGE_SIZE = 30;

export const useChannelMessages = (channelId: string | null): UseChannelMessagesResult => {
    const queryClient = useQueryClient();
    const queryResult = useInfiniteQuery<MessageHistoryResponse>({
        queryKey: CHANNEL_MESSAGES_QUERY_KEY(channelId ?? ''),
        queryFn: async ({ pageParam }): Promise<MessageHistoryResponse> => {
            if (!channelId) {
                throw new Error('Channel ID is required');
            }
            const response = await apiClients.messages.messageControllerFindByChannel(
                channelId,
                pageParam as string | undefined,
                PAGE_SIZE,
                'desc'
            );
            const payload = response.data as unknown as RawMessageHistoryResponse;
            return {
                messages: payload.messages.map(mapMessageResponse),
                hasMore: payload.hasMore,
                nextCursor: payload.nextCursor
            };
        },
        enabled: Boolean(channelId),
        initialPageParam: undefined,
        getNextPageParam: lastPage => (lastPage.hasMore ? lastPage.nextCursor : undefined)
    });

    const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } =
        queryResult;

    const messages: Message[] = React.useMemo(() => {
        if (!data?.pages) {
            return [];
        }
        const messageMap = new Map<string, Message>();
        data.pages.forEach(page => {
            page.messages.forEach(message => {
                messageMap.set(message.id, message);
            });
        });
        return Array.from(messageMap.values()).sort((a, b) => {
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });
    }, [data]);

    const invalidate = React.useCallback(async (): Promise<void> => {
        if (!channelId) {
            return;
        }
        await queryClient.invalidateQueries({ queryKey: CHANNEL_MESSAGES_QUERY_KEY(channelId) });
    }, [channelId, queryClient]);

    return {
        messages,
        isInitialLoading: isLoading,
        fetchNextPage,
        hasNextPage: Boolean(hasNextPage),
        isFetchingNextPage,
        refetch,
        invalidate
    };
};
