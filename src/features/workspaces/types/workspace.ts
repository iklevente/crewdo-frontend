import type { WorkspaceResponseDto } from 'api/models/workspace-response-dto';

interface WorkspaceOwner {
    readonly id: string;
    readonly firstName?: string;
    readonly lastName?: string;
    readonly email: string;
}

export interface WorkspaceChannelSummary {
    readonly id: string;
    readonly name: string;
    readonly type?: string;
    readonly visibility?: string;
    readonly unreadCount?: number;
    readonly lastMessage?: {
        readonly id: string;
        readonly content: string;
        readonly author: {
            readonly id: string;
            readonly firstName?: string;
            readonly lastName?: string;
        };
        readonly createdAt: string;
    };
}

export interface Workspace extends Omit<WorkspaceResponseDto, 'owner' | 'channels' | 'members'> {
    readonly owner: WorkspaceOwner;
    readonly channels?: WorkspaceChannelSummary[];
    readonly members?: WorkspaceMember[];
}

export interface WorkspaceMember {
    readonly id: string;
    readonly firstName?: string;
    readonly lastName?: string;
    readonly email: string;
    readonly profilePicture?: string | null;
    readonly joinedAt?: string;
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

export interface WorkspaceMembersResponse {
    readonly owner: WorkspaceMember;
    readonly members: WorkspaceMember[];
}
