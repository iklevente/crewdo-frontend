import React from 'react';
import { Chip } from '@mui/material';
import CallIcon from '@mui/icons-material/Call';
import VideocamIcon from '@mui/icons-material/Videocam';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import type { CallType } from '../types/call';

interface CallTypeBadgeProps {
    readonly type: CallType;
    readonly size?: 'small' | 'medium';
}

const resolveType = (type: CallType): { label: string; icon: React.ReactElement } => {
    switch (type) {
        case 'voice':
            return { label: 'Voice', icon: <CallIcon fontSize="small" /> };
        case 'video':
            return { label: 'Video', icon: <VideocamIcon fontSize="small" /> };
        case 'screen_share':
        default:
            return { label: 'Screen share', icon: <ScreenShareIcon fontSize="small" /> };
    }
};

export const CallTypeBadge: React.FC<CallTypeBadgeProps> = ({ type, size = 'small' }) => {
    const { label, icon } = resolveType(type);

    return <Chip icon={icon} label={label} size={size} variant="outlined" color="primary" />;
};
