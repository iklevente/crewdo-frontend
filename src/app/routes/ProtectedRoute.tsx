import React from 'react';
import { useAuthStore } from 'store/auth-store';
import { Navigate, Outlet } from 'react-router-dom';
import { SplashScreen } from '../components/SplashScreen';

interface ProtectedRouteProps {
    readonly redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ redirectTo = '/login' }) => {
    const accessToken = useAuthStore(state => state.accessToken);
    const isHydrated = useAuthStore(state => state.isHydrated);

    if (!isHydrated) {
        return <SplashScreen message="Preparing secure area..." />;
    }

    if (!accessToken) {
        return <Navigate to={redirectTo} replace />;
    }

    return <Outlet />;
};
