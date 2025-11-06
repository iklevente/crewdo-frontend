export type CallType = 'voice' | 'video';

export type CallStatus = 'scheduled' | 'active' | 'ended' | 'cancelled';

type CallParticipantStatus = 'invited' | 'joined' | 'left' | 'kicked' | 'declined';

export interface CallParticipantSummary {
    readonly id: string;
    readonly user: {
        readonly id: string;
        readonly firstName?: string;
        readonly lastName?: string;
    };
    readonly status: CallParticipantStatus;
    readonly joinedAt?: string | null;
    readonly leftAt?: string | null;
    readonly isMuted: boolean;
    readonly isVideoEnabled: boolean;
    readonly isScreenSharing: boolean;
    readonly connectionQuality?: string | null;
}

export interface CallSummary {
    readonly id: string;
    readonly title?: string | null;
    readonly description?: string | null;
    readonly type: CallType;
    readonly status: CallStatus;
    readonly createdAt: string;
    readonly updatedAt: string;
    readonly startedAt?: string | null;
    readonly endedAt?: string | null;
    readonly scheduledStartTime?: string | null;
    readonly scheduledEndTime?: string | null;
    readonly roomName?: string | null;
    readonly initiator: {
        readonly id: string;
        readonly firstName?: string;
        readonly lastName?: string;
    };
    readonly participants: CallParticipantSummary[];
    readonly duration?: number | null;
    readonly maxParticipants?: number | null;
}

export interface CallSessionCredentials {
    readonly token: string;
    readonly url: string;
    readonly roomName: string;
    readonly identity: string;
    readonly isHost: boolean;
    readonly participantId?: string | null;
}
