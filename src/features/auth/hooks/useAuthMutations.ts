import { useMutation } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { toast } from 'react-hot-toast';
import type { LoginDto } from 'api/models/login-dto';
import type { RegisterDto } from 'api/models/register-dto';
import { useAuthStore } from 'store/auth-store';
import { login, register } from '../api/auth-api';
import type { AuthSession } from '../types';

const extractErrorMessage = (error: unknown): string => {
    if (typeof error === 'string') {
        return error;
    }

    if (error && typeof error === 'object' && 'message' in error) {
        const { message } = error as { message?: unknown };
        if (typeof message === 'string') {
            return message;
        }
    }

    return 'Unexpected error occurred';
};

export const useLoginMutation = (): UseMutationResult<
    AuthSession,
    AxiosError,
    LoginDto,
    unknown
> => {
    const setSession = useAuthStore(state => state.setSession);

    return useMutation<AuthSession, AxiosError, LoginDto>({
        mutationFn: login,
        onSuccess: session => {
            setSession(session);
            toast.success('Welcome back!');
        },
        onError: error => {
            toast.error(extractErrorMessage(error.response?.data ?? error));
        }
    });
};

export const useRegisterMutation = (): UseMutationResult<
    AuthSession,
    AxiosError,
    RegisterDto,
    unknown
> => {
    const setSession = useAuthStore(state => state.setSession);

    return useMutation<AuthSession, AxiosError, RegisterDto>({
        mutationFn: register,
        onSuccess: session => {
            setSession(session);
            toast.success('Account created!');
        },
        onError: error => {
            toast.error(extractErrorMessage(error.response?.data ?? error));
        }
    });
};
