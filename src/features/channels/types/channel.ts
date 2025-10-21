import type { ChannelResponseDto } from 'api/models/channel-response-dto';
import {
    ChannelResponseDtoTypeEnum,
    ChannelResponseDtoVisibilityEnum
} from 'api/models/channel-response-dto';

type ChannelType = ChannelResponseDtoTypeEnum;
type ChannelVisibility = ChannelResponseDtoVisibilityEnum;

interface ChannelMember {
    readonly id: string;
    readonly firstName?: string;
    readonly lastName?: string;
    readonly email: string;
    readonly presence?: {
        readonly status: string;
        readonly customStatus?: string | null;
        readonly statusSource?: 'auto' | 'manual';
        readonly manualStatus?: string | null;
        readonly manualCustomStatus?: string | null;
        readonly lastSeenAt?: string | null;
        readonly timestamp?: string;
    };
}

interface ChannelLastMessage {
    readonly id: string;
    readonly content: string;
    readonly createdAt: string;
    readonly author: {
        readonly id: string;
        readonly firstName?: string;
        readonly lastName?: string;
    };
}

interface ChannelWorkspaceInfo {
    readonly id: string;
    readonly name: string;
}

interface ChannelProjectInfo {
    readonly id: string;
    readonly name: string;
}

export interface Channel {
    readonly id: string;
    readonly name: string;
    readonly description?: string;
    readonly type: ChannelType;
    readonly visibility: ChannelVisibility;
    readonly topic?: string;
    readonly isArchived: boolean;
    readonly createdAt: string;
    readonly updatedAt: string;
    readonly creator?: ChannelMember;
    readonly members: ChannelMember[];
    readonly workspace?: ChannelWorkspaceInfo;
    readonly project?: ChannelProjectInfo;
    readonly messageCount?: number;
    readonly unreadCount?: number;
    readonly lastMessage?: ChannelLastMessage;
}

export const mapChannelResponse = (payload: ChannelResponseDto): Channel => {
    const members = Array.isArray(payload.members)
        ? (payload.members as unknown as ChannelMember[])
        : [];

    return {
        id: payload.id,
        name: payload.name,
        description: payload.description,
        type: payload.type,
        visibility: payload.visibility,
        topic: payload.topic,
        isArchived: payload.isArchived,
        createdAt: payload.createdAt,
        updatedAt: payload.updatedAt,
        creator: payload.creator as ChannelMember | undefined,
        members,
        workspace: payload.workspace as ChannelWorkspaceInfo | undefined,
        project: payload.project as ChannelProjectInfo | undefined,
        messageCount: payload.messageCount,
        unreadCount: payload.unreadCount,
        lastMessage: payload.lastMessage as ChannelLastMessage | undefined
    };
};
