import React from 'react';
import { Box, Chip, Skeleton, Stack, Tooltip, Typography } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import LockIcon from '@mui/icons-material/LockOutlined';
import PublicIcon from '@mui/icons-material/Public';
import GroupIcon from '@mui/icons-material/GroupOutlined';
import ForumIcon from '@mui/icons-material/ForumOutlined';
import type { Channel } from '../types/channel';

interface ChannelHeaderProps {
    readonly channel: Channel | undefined;
    readonly isLoading: boolean;
}

export const ChannelHeader: React.FC<ChannelHeaderProps> = ({ channel, isLoading }) => {
    if (isLoading) {
        return (
            <Stack direction="row" spacing={2} alignItems="center" sx={{ p: 2 }}>
                <Skeleton variant="rounded" width={180} height={28} />
                <Skeleton variant="rounded" width={80} height={24} />
                <Skeleton variant="rounded" width={100} height={24} />
            </Stack>
        );
    }

    if (!channel) {
        return (
            <Box sx={{ p: 2 }}>
                <Typography variant="subtitle1" color="text.secondary">
                    Select a channel to start chatting.
                </Typography>
            </Box>
        );
    }

    const memberCount = channel.members.length;

    return (
        <Box sx={{ p: 2 }}>
            <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap">
                <Stack direction="row" alignItems="center" spacing={1}>
                    <ForumIcon color="primary" fontSize="small" />
                    <Typography variant="h6" fontWeight={700}>
                        {channel.name}
                    </Typography>
                </Stack>
                <Chip label={channel.type} size="small" variant="outlined" />
                <Chip
                    icon={
                        channel.visibility === 'private' ? (
                            <LockIcon fontSize="inherit" />
                        ) : (
                            <PublicIcon fontSize="inherit" color="success" />
                        )
                    }
                    label={channel.visibility === 'private' ? 'Private' : 'Public'}
                    size="small"
                />
                <Chip
                    icon={<GroupIcon fontSize="inherit" />}
                    label={`${memberCount} member${memberCount === 1 ? '' : 's'}`}
                    size="small"
                />
                {channel.topic ? (
                    <Tooltip title="Channel topic">
                        <Chip
                            icon={<InfoOutlinedIcon fontSize="inherit" />}
                            label={channel.topic}
                            size="small"
                        />
                    </Tooltip>
                ) : null}
            </Stack>
            {channel.description ? (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {channel.description}
                </Typography>
            ) : null}
        </Box>
    );
};
