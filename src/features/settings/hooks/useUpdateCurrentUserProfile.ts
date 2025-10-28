import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UpdateUserDto } from 'api/models/update-user-dto';
import type { UserResponseDto } from 'api/models/user-response-dto';
import toast from 'react-hot-toast';
import { useAuthStore } from 'store/auth-store';
import { apiClients } from 'services/api-clients';
import {
    CURRENT_USER_PROFILE_QUERY_KEY,
    mapUserResponseToProfile,
    type UserProfile
} from './useCurrentUserProfile';

interface UpdateProfileInput {
    readonly firstName: string;
    readonly lastName: string;
    readonly phoneNumber?: string;
    readonly department?: string;
    readonly position?: string;
}

const sanitizeOptional = (value?: string): string | undefined => {
    if (!value) {
        return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
};

export const useUpdateCurrentUserProfile = (): {
    readonly updateProfile: (input: UpdateProfileInput) => Promise<UserProfile>;
    readonly isPending: boolean;
} => {
    const queryClient = useQueryClient();
    const setUser = useAuthStore(state => state.setUser);

    const mutation = useMutation<UserProfile, unknown, UpdateProfileInput>({
        mutationFn: async input => {
            const payload: UpdateUserDto = {
                firstName: input.firstName.trim(),
                lastName: input.lastName.trim(),
                phoneNumber: sanitizeOptional(input.phoneNumber),
                department: sanitizeOptional(input.department),
                position: sanitizeOptional(input.position)
            };

            const response = await apiClients.users.usersControllerUpdateProfile(payload);
            const { data } = response as { data?: UserResponseDto | null };

            if (!data) {
                throw new Error('Profile update response is empty');
            }

            return mapUserResponseToProfile(data);
        },
        onSuccess: async profile => {
            const { user: currentAuthUser } = useAuthStore.getState();
            setUser({
                id: profile.id,
                email: profile.email,
                firstName: profile.firstName,
                lastName: profile.lastName,
                role: profile.role,
                workspaceId: currentAuthUser?.workspaceId ?? null
            });

            queryClient.setQueryData(CURRENT_USER_PROFILE_QUERY_KEY, profile);
            await queryClient.invalidateQueries({ queryKey: CURRENT_USER_PROFILE_QUERY_KEY });
            toast.success('Profile updated');
        },
        onError: error => {
            const message =
                error instanceof Error ? error.message : 'Could not update your profile';
            toast.error(message);
        }
    });

    const updateProfile = async (input: UpdateProfileInput): Promise<UserProfile> => {
        return await mutation.mutateAsync(input);
    };

    return {
        updateProfile,
        isPending: mutation.isPending
    };
};
