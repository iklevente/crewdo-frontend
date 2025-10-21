import React from 'react';
import { useAuthStore } from 'store/auth-store';
import { Navigate, Outlet } from 'react-router-dom';
import { SplashScreen } from '../components/SplashScreen';

interface PublicRouteProps {
    readonly redirectTo?: string;
}

export const PublicRoute: React.FC<PublicRouteProps> = ({ redirectTo = '/app' }) => {
    const accessToken = useAuthStore(state => state.accessToken);
    const isHydrated = useAuthStore(state => state.isHydrated);

    if (!isHydrated) {
        return <SplashScreen message="Preparing application..." />;
    }

    if (accessToken) {
        return <Navigate to={redirectTo} replace />;
    }

    return <Outlet />;
};
