import React from 'react';
import { Box, Stack, Typography } from '@mui/material';

interface PresenceBadgeProps {
    readonly status?: string;
    readonly customStatus?: string | null;
}

const resolvePresenceColor = (status?: string): string => {
    switch (status?.toLowerCase()) {
        case 'online':
            return '#4caf50';
        case 'away':
        case 'idle':
            return '#ff9800';
        case 'dnd':
        case 'busy':
            return '#f44336';
        default:
            return '#9e9e9e';
    }
};

const resolvePresenceLabel = (status?: string): string => {
    if (!status) {
        return 'Offline';
    }
    const normalized = status.toLowerCase();
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

export const PresenceBadge: React.FC<PresenceBadgeProps> = ({ status, customStatus }) => {
    const color = resolvePresenceColor(status);
    const label = resolvePresenceLabel(status);

    return (
        <Stack direction="row" alignItems="center" spacing={1} sx={{ minHeight: 24 }}>
            <Box
                data-testid="presence-indicator"
                sx={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    backgroundColor: color,
                    boxShadow: theme => `0 0 0 2px ${theme.palette.background.paper}`
                }}
            />
            <Typography variant="caption" color="text.secondary">
                {customStatus ? `${label} • ${customStatus}` : label}
            </Typography>
        </Stack>
    );
};
