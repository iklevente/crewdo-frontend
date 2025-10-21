import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import toast from 'react-hot-toast';
import { apiClients } from 'services/api-clients';
import { useAuthStore } from 'store/auth-store';

export const OverviewPage: React.FC = () => {
    const refreshToken = useAuthStore(state => state.refreshToken);
    const setTokens = useAuthStore(state => state.setTokens);
    const clearAuth = useAuthStore(state => state.clearAuth);
    const isHydrated = useAuthStore(state => state.isHydrated);

    React.useEffect(() => {
        let cancelled = false;

        const refreshAccessToken = async (): Promise<void> => {
            if (!isHydrated || !refreshToken) {
                return;
            }

            try {
                const response = await apiClients.auth.authControllerRefresh({
                    refresh_token: refreshToken
                });
                const payload = response.data as unknown as { access_token?: string };
                if (!payload?.access_token) {
                    throw new Error('No access token returned');
                }
                if (!cancelled) {
                    setTokens(payload.access_token, refreshToken);
                }
            } catch (error) {
                if (cancelled) {
                    return;
                }
                console.error('Failed to refresh access token on overview load:', error);
                clearAuth();
                toast.error('Your session expired. Please sign in again.');
            }
        };

        void refreshAccessToken();

        return () => {
            cancelled = true;
        };
    }, [clearAuth, isHydrated, refreshToken, setTokens]);

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
                Welcome to Crewdo
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                Select a workspace, channel, or project to get started.
            </Typography>
            <Box
                sx={{
                    display: 'grid',
                    gap: 3,
                    gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
                    mt: 1
                }}
            >
                <Paper sx={{ p: 2 }}>
                    <Typography variant="h6">Quick Actions</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Use the sidebar to navigate between chat, tasks, and calls. We will populate
                        this dashboard with workspace insights as you start collaborating.
                    </Typography>
                </Paper>
            </Box>
        </Box>
    );
};
