import type { MessageResponseDto } from 'api/models/message-response-dto';

export interface MessageAttachment {
    readonly id: string;
    readonly filename: string;
    readonly url: string;
    readonly size: number;
    readonly mimeType: string;
}

interface MessageReactionUser {
    readonly id: string;
    readonly firstName?: string;
    readonly lastName?: string;
}

interface MessageReaction {
    readonly id: string;
    readonly emoji: string;
    readonly count: number;
    readonly users: MessageReactionUser[];
    readonly userReacted: boolean;
}

interface MessageAuthor {
    readonly id: string;
    readonly firstName?: string;
    readonly lastName?: string;
    readonly email?: string;
}

interface MessageChannelInfo {
    readonly id: string;
    readonly name: string;
    readonly type?: string;
}

interface ParentMessageSummary {
    readonly id: string;
    readonly content: string;
    readonly author: MessageAuthor;
}

export interface Message {
    readonly id: string;
    readonly content: string;
    readonly createdAt: string;
    readonly updatedAt: string;
    readonly editedAt?: string;
    readonly isEdited: boolean;
    readonly isPinned: boolean;
    readonly isDeleted: boolean;
    readonly embedData?: unknown;
    readonly author: MessageAuthor;
    readonly channel: MessageChannelInfo;
    readonly parentMessage?: ParentMessageSummary;
    readonly attachments: MessageAttachment[];
    readonly reactions: MessageReaction[];
}

export interface MessageHistoryResponse {
    readonly messages: Message[];
    readonly hasMore: boolean;
    readonly nextCursor?: string;
}

export const mapMessageResponse = (payload: MessageResponseDto): Message => {
    const attachments = Array.isArray(payload.attachments)
        ? (payload.attachments as unknown as MessageAttachment[])
        : [];
    const reactions = Array.isArray(payload.reactions)
        ? (payload.reactions as unknown as MessageReaction[])
        : [];

    return {
        id: payload.id,
        content: payload.content,
        createdAt: payload.createdAt,
        updatedAt: payload.updatedAt,
        editedAt: payload.editedAt,
        isEdited: payload.isEdited,
        isPinned: payload.isPinned,
        isDeleted: payload.isDeleted,
        embedData: payload.embedData,
        author: payload.author as MessageAuthor,
        channel: payload.channel as MessageChannelInfo,
        parentMessage: payload.parentMessage as ParentMessageSummary | undefined,
        attachments,
        reactions
    };
};
