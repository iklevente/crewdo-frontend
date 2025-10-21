interface UserPresenceSnapshot {
    readonly status?: string;
    readonly customStatus?: string | null;
    readonly statusSource?: 'auto' | 'manual';
    readonly manualStatus?: string | null;
    readonly manualCustomStatus?: string | null;
    readonly lastSeenAt?: string | null;
    readonly timestamp?: string;
}

export interface UserProfileSnapshot {
    readonly id: string;
    readonly firstName?: string;
    readonly lastName?: string;
    readonly email?: string;
    readonly profilePicture?: string | null;
    readonly presence?: UserPresenceSnapshot;
}
