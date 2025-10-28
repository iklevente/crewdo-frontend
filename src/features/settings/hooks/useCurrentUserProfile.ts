import { useQuery } from '@tanstack/react-query';
import type { UserResponseDto } from 'api/models/user-response-dto';
import { apiClients } from 'services/api-clients';

export const CURRENT_USER_PROFILE_QUERY_KEY = ['users', 'me'] as const;

export interface UserProfile {
    readonly id: string;
    readonly email: string;
    readonly firstName: string;
    readonly lastName: string;
    readonly role: string;
    readonly status: string;
    readonly phoneNumber: string | null;
    readonly department: string | null;
    readonly position: string | null;
    readonly profilePicture: string | null;
    readonly isEmailVerified: boolean;
    readonly createdAt: string;
    readonly updatedAt: string;
    readonly lastLoginAt: string | null;
}

export const mapUserResponseToProfile = (payload: UserResponseDto): UserProfile => {
    return {
        id: payload.id,
        email: payload.email,
        firstName: payload.firstName,
        lastName: payload.lastName,
        role: payload.role,
        status: payload.status,
        phoneNumber: payload.phoneNumber ?? null,
        department: payload.department ?? null,
        position: payload.position ?? null,
        profilePicture: payload.profilePicture ?? null,
        isEmailVerified: Boolean(payload.isEmailVerified),
        createdAt: payload.createdAt,
        updatedAt: payload.updatedAt,
        lastLoginAt: payload.lastLoginAt ?? null
    };
};

const fetchCurrentUserProfile = async (): Promise<UserProfile> => {
    const response = await apiClients.users.usersControllerGetProfile();
    const payload = (response as { data?: UserResponseDto | null }).data;

    if (!payload) {
        throw new Error('Failed to load user profile');
    }

    return mapUserResponseToProfile(payload);
};

export const useCurrentUserProfile = (): {
    readonly profile: UserProfile | null;
    readonly isLoading: boolean;
    readonly isFetching: boolean;
    readonly isError: boolean;
    readonly refetch: () => Promise<unknown>;
} => {
    const queryResult = useQuery<UserProfile>({
        queryKey: CURRENT_USER_PROFILE_QUERY_KEY,
        queryFn: fetchCurrentUserProfile,
        staleTime: 60_000
    });

    return {
        profile: queryResult.data ?? null,
        isLoading: queryResult.isLoading,
        isFetching: queryResult.isFetching,
        isError: queryResult.isError,
        refetch: queryResult.refetch
    };
};
