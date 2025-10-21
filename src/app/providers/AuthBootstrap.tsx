import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClients } from 'services/api-clients';
import { useAuthStore } from 'store/auth-store';
import type { AuthUser } from 'features/auth/types';
import { SplashScreen } from '../components/SplashScreen';

const AUTH_PROFILE_QUERY_KEY = ['auth', 'profile'];

export const AuthBootstrap: React.FC<React.PropsWithChildren> = ({ children }) => {
    const accessToken = useAuthStore(state => state.accessToken);
    const user = useAuthStore(state => state.user);
    const setUser = useAuthStore(state => state.setUser);
    const clearAuth = useAuthStore(state => state.clearAuth);
    const isHydrated = useAuthStore(state => state.isHydrated);

    const shouldLoadProfile = Boolean(accessToken) && !user && isHydrated;

    const {
        data: profile,
        isLoading,
        isError
    } = useQuery<AuthUser>({
        queryKey: AUTH_PROFILE_QUERY_KEY,
        queryFn: async () => {
            const response = await apiClients.auth.authControllerGetProfile();
            return response.data as unknown as AuthUser;
        },
        enabled: shouldLoadProfile,
        staleTime: 5 * 60 * 1000,
        retry: false
    });

    React.useEffect(() => {
        if (profile) {
            setUser(profile);
        }
    }, [profile, setUser]);

    React.useEffect(() => {
        if (isError) {
            clearAuth();
        }
    }, [clearAuth, isError]);

    if (!isHydrated) {
        return <SplashScreen message="Preparing your workspace..." />;
    }

    if (isLoading && accessToken) {
        return <SplashScreen message="Loading your account..." />;
    }

    return <>{children}</>;
};
