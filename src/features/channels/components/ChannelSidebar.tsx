import React from 'react';
import { Box, Button, Divider, List, Skeleton, Stack, Typography } from '@mui/material';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import type { Channel } from '../types/channel';
import { ChannelListItem } from './ChannelListItem';

interface ChannelSidebarProps {
    readonly channels: Channel[];
    readonly activeChannelId: string | null;
    readonly isLoading: boolean;
    readonly onSelectChannel: (channelId: string) => void;
    readonly onOpenConversations?: () => void;
}

const renderSkeletonList = (rows: number): React.ReactElement => (
    <Stack spacing={2} sx={{ p: 2 }}>
        {Array.from({ length: rows }).map((_, index) => (
            <Skeleton key={index} height={36} variant="rounded" />
        ))}
    </Stack>
);

export const ChannelSidebar: React.FC<ChannelSidebarProps> = ({
    channels,
    activeChannelId,
    isLoading,
    onSelectChannel,
    onOpenConversations
}) => {
    const sortedWorkspaceChannels = React.useMemo(
        () => [...channels].sort((a, b) => a.name.localeCompare(b.name)),
        [channels]
    );

    const isSidebarLoading = isLoading && sortedWorkspaceChannels.length === 0;

    return (
        <Box
            sx={{
                width: 320,
                borderRight: theme => `1px solid ${theme.palette.divider}`,
                height: '100%',
                display: 'flex',
                flexDirection: 'column'
            }}
        >
            <Box sx={{ p: 2 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                    <ChatBubbleOutlineIcon fontSize="small" />
                    <Typography variant="subtitle1" fontWeight={600}>
                        Channels
                    </Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Browse channels in this workspace.
                </Typography>
            </Box>
            <Divider />

            {isSidebarLoading ? (
                renderSkeletonList(4)
            ) : (
                <List disablePadding>
                    {sortedWorkspaceChannels.map(channel => (
                        <ChannelListItem
                            key={channel.id}
                            channel={channel}
                            selected={channel.id === activeChannelId}
                            onSelect={selectedChannel => onSelectChannel(selectedChannel.id)}
                            showVisibility
                        />
                    ))}
                    {sortedWorkspaceChannels.length === 0 ? (
                        <Box sx={{ px: 2, py: 3 }}>
                            <Typography variant="body2" color="text.secondary">
                                No channels yet. Create one from the workspace settings.
                            </Typography>
                        </Box>
                    ) : null}
                </List>
            )}

            {onOpenConversations ? (
                <Box sx={{ px: 2, py: 3 }}>
                    <Button fullWidth variant="outlined" onClick={onOpenConversations}>
                        Browse conversations
                    </Button>
                </Box>
            ) : null}
        </Box>
    );
};
