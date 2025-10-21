export interface AuthUser {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    workspaceId?: string | number | null;
}

export interface AuthSession {
    accessToken: string;
    refreshToken: string;
    user: AuthUser;
}
