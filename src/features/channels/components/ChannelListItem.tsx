import React from 'react';
import { Box, Chip, ListItemButton, ListItemText, Stack, Typography } from '@mui/material';
import LockIcon from '@mui/icons-material/LockOutlined';
import PublicIcon from '@mui/icons-material/Public';
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';
import type { Channel } from '../types/channel';

interface ChannelListItemProps {
    readonly channel: Channel;
    readonly selected: boolean;
    readonly onSelect: (channel: Channel) => void;
    readonly showVisibility?: boolean;
}

export const ChannelListItem: React.FC<ChannelListItemProps> = ({
    channel,
    selected,
    onSelect,
    showVisibility = false
}) => {
    const { lastMessage } = channel;
    const lastMessagePreview = lastMessage?.content ?? 'No messages yet';
    const authorName = lastMessage
        ? `${lastMessage.author.firstName ?? ''} ${lastMessage.author.lastName ?? ''}`.trim() ||
          'Someone'
        : null;
    const relativeTime = lastMessage
        ? formatDistanceToNow(new Date(lastMessage.createdAt), { addSuffix: true })
        : null;

    return (
        <ListItemButton
            onClick={() => onSelect(channel)}
            selected={selected}
            sx={{ alignItems: 'flex-start', py: 1.5, px: 2 }}
        >
            <ListItemText
                disableTypography
                primary={
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
                        <Typography variant="subtitle2" fontWeight={600} noWrap>
                            {channel.name}
                        </Typography>
                        {showVisibility ? (
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
                        ) : null}
                        {typeof channel.unreadCount === 'number' && channel.unreadCount > 0 ? (
                            <Chip
                                label={`${channel.unreadCount} unread`}
                                size="small"
                                color="primary"
                            />
                        ) : null}
                    </Stack>
                }
                secondary={
                    <Box sx={{ mt: 0.75, minWidth: 0 }}>
                        <Stack spacing={0.5}>
                            <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{
                                    display: '-webkit-box',
                                    WebkitLineClamp: 1,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden'
                                }}
                            >
                                {lastMessagePreview}
                            </Typography>
                            {authorName && relativeTime ? (
                                <Typography variant="caption" color="text.secondary">
                                    {authorName} • {relativeTime}
                                </Typography>
                            ) : null}
                        </Stack>
                    </Box>
                }
            />
        </ListItemButton>
    );
};
