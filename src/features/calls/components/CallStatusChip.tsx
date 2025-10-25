import React from 'react';
import { Chip } from '@mui/material';
import type { CallStatus } from '../types/call';

interface CallStatusChipProps {
    readonly status: CallStatus;
}

const resolveAppearance = (
    status: CallStatus
): {
    readonly label: string;
    readonly color: 'default' | 'warning' | 'success' | 'error';
    readonly variant: 'filled' | 'outlined';
} => {
    switch (status) {
        case 'active':
            return { label: 'Active', color: 'success', variant: 'filled' };
        case 'scheduled':
            return { label: 'Scheduled', color: 'warning', variant: 'outlined' };
        case 'cancelled':
            return { label: 'Cancelled', color: 'default', variant: 'outlined' };
        case 'ended':
        default:
            return { label: 'Ended', color: 'default', variant: 'outlined' };
    }
};

export const CallStatusChip: React.FC<CallStatusChipProps> = ({ status }) => {
    const { label, color, variant } = resolveAppearance(status);
    return <Chip label={label} color={color} variant={variant} size="small" />;
};
