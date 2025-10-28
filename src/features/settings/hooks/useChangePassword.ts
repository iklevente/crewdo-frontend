import { useMutation } from '@tanstack/react-query';
import type { ChangePasswordDto } from 'api/models/change-password-dto';
import toast from 'react-hot-toast';
import { apiClients } from 'services/api-clients';

interface ChangePasswordInput {
    readonly currentPassword: string;
    readonly newPassword: string;
}

export const useChangePassword = (): {
    readonly changePassword: (input: ChangePasswordInput) => Promise<void>;
    readonly isPending: boolean;
} => {
    const mutation = useMutation<void, unknown, ChangePasswordInput>({
        mutationFn: async input => {
            const payload: ChangePasswordDto = {
                currentPassword: input.currentPassword,
                newPassword: input.newPassword
            };
            await apiClients.users.usersControllerChangePassword(payload);
        },
        onSuccess: () => {
            toast.success('Password updated');
        },
        onError: error => {
            const message =
                error instanceof Error ? error.message : 'Could not update your password';
            toast.error(message);
        }
    });

    const changePassword = async (input: ChangePasswordInput): Promise<void> => {
        await mutation.mutateAsync(input);
    };

    return {
        changePassword,
        isPending: mutation.isPending
    };
};
