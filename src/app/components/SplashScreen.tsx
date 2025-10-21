import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

interface SplashScreenProps {
    readonly message?: string;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ message }) => {
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100vh',
                gap: 2
            }}
        >
            <CircularProgress />
            <Typography variant="body1" color="text.secondary">
                {message ?? 'Loading workspace...'}
            </Typography>
        </Box>
    );
};
