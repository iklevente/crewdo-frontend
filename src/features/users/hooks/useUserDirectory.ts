import { useQuery } from '@tanstack/react-query';
import { apiClients } from 'services/api-clients';
import type { WorkspaceMember } from 'features/workspaces/types/workspace';

export const USER_DIRECTORY_QUERY_KEY = ['user-directory'] as const;

interface RawUser {
    readonly id: string;
    readonly email?: string;
    readonly firstName?: string;
    readonly lastName?: string;
    readonly profilePicture?: string | null;
}

interface UseUserDirectoryResult {
    readonly members: WorkspaceMember[];
    readonly isLoading: boolean;
    readonly isError: boolean;
}

export const useUserDirectory = (): UseUserDirectoryResult => {
    const {
        data: members = [],
        isLoading,
        isError
    } = useQuery<WorkspaceMember[]>({
        queryKey: USER_DIRECTORY_QUERY_KEY,
        queryFn: async () => {
            const response = await apiClients.users.usersControllerSearch('');
            const payload = response.data as unknown as RawUser[];
            return payload.map(user => ({
                id: user.id,
                email: user.email ?? '',
                firstName: user.firstName,
                lastName: user.lastName,
                profilePicture: user.profilePicture ?? null
            }));
        },
        staleTime: 60000
    });

    return {
        members,
        isLoading,
        isError
    };
};
