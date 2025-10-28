import React from 'react';
import { useSocket } from 'services/socket-context';

const sanitizeChannelIds = (ids: readonly string[]): string[] => {
    return ids.filter((id): id is string => typeof id === 'string' && id.trim().length > 0);
};

export const useConversationChannelSubscriptions = (channelIds: readonly string[]): void => {
    const { joinChannel, leaveChannel } = useSocket();
    const previousChannelIdsRef = React.useRef<Set<string>>(new Set());

    React.useEffect(() => {
        const nextIds = new Set(sanitizeChannelIds(channelIds));
        const previousIds = previousChannelIdsRef.current;

        nextIds.forEach(channelId => {
            if (!previousIds.has(channelId)) {
                joinChannel(channelId);
            }
        });

        previousIds.forEach(channelId => {
            if (!nextIds.has(channelId)) {
                leaveChannel(channelId);
            }
        });

        previousChannelIdsRef.current = nextIds;
    }, [channelIds, joinChannel, leaveChannel]);

    React.useEffect(() => {
        return () => {
            const previousIds = previousChannelIdsRef.current;
            previousIds.forEach(channelId => {
                leaveChannel(channelId);
            });
            previousChannelIdsRef.current = new Set();
        };
    }, [leaveChannel]);
};
