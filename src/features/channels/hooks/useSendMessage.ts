import { useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import type { CreateMessageDto } from 'api/models/create-message-dto';
import type { MessageResponseDto } from 'api/models/message-response-dto';
import { apiClients } from 'services/api-clients';
import type { Message, MessageHistoryResponse } from 'features/messages/types/message';
import { mapMessageResponse } from 'features/messages/types/message';
import { CHANNEL_MESSAGES_QUERY_KEY } from './useChannelMessages';
import { CHANNEL_DETAILS_QUERY_KEY } from './useChannelDetails';
import { WORKSPACE_CHANNELS_QUERY_KEY } from './useWorkspaceChannels';

interface SendMessagePayload {
    readonly content: string;
    readonly parentMessageId?: string;
    readonly attachmentIds?: string[];
    readonly mentionedUserIds?: string[];
    readonly embedData?: Record<string, unknown>;
}

interface UseSendMessageParams {
    readonly channelId: string | null;
    readonly workspaceId: string | null;
}

interface UseSendMessageResult {
    readonly sendMessage: (payload: SendMessagePayload) => Promise<Message | null>;
    readonly isSending: boolean;
}

export const useSendMessage = ({
    channelId,
    workspaceId
}: UseSendMessageParams): UseSendMessageResult => {
    const queryClient = useQueryClient();

    const { mutateAsync, isPending } = useMutation<Message, Error, SendMessagePayload>({
        mutationFn: async payload => {
            if (!channelId) {
                throw new Error('Channel ID is required');
            }
            const requestPayload: CreateMessageDto = {
                content: payload.content,
                channelId,
                parentMessageId: payload.parentMessageId,
                attachmentIds: payload.attachmentIds
            };
            const response = await apiClients.messages.messageControllerCreate(requestPayload);
            const messageResponse = response.data as unknown as MessageResponseDto;
            return mapMessageResponse(messageResponse);
        },
        onSuccess: message => {
            if (!channelId) {
                return;
            }
            const channelMessagesKey = CHANNEL_MESSAGES_QUERY_KEY(channelId);
            queryClient.setQueryData<InfiniteData<MessageHistoryResponse>>(
                channelMessagesKey,
                existing => {
                    if (!existing) {
                        return existing;
                    }
                    const [firstPage, ...restPages] = existing.pages;
                    if (!firstPage) {
                        return existing;
                    }
                    const updatedFirstPage: MessageHistoryResponse = {
                        ...firstPage,
                        messages: [
                            message,
                            ...firstPage.messages.filter(
                                existingMessage => existingMessage.id !== message.id
                            )
                        ]
                    };
                    return {
                        pageParams: existing.pageParams,
                        pages: [updatedFirstPage, ...restPages]
                    };
                }
            );

            void queryClient.invalidateQueries({ queryKey: CHANNEL_DETAILS_QUERY_KEY(channelId) });
            if (workspaceId) {
                void queryClient.invalidateQueries({
                    queryKey: WORKSPACE_CHANNELS_QUERY_KEY(workspaceId)
                });
            }
        },
        onError: error => {
            const message = error instanceof Error ? error.message : 'Failed to send message';
            toast.error(message);
        }
    });

    const sendMessage = async (payload: SendMessagePayload): Promise<Message | null> => {
        if (!channelId) {
            toast.error('Cannot send message without a channel');
            return null;
        }
        const hasText = payload.content.trim().length > 0;
        const hasAttachments = Boolean(payload.attachmentIds?.length);
        if (!hasText && !hasAttachments) {
            toast.error('Add a message or attach a file before sending.');
            return null;
        }
        try {
            return await mutateAsync(payload);
        } catch {
            return null;
        }
    };

    return {
        sendMessage,
        isSending: isPending
    };
};
