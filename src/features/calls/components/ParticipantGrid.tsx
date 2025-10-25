import React from 'react';
import { Box, Typography, Avatar, Stack } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { ParticipantTile } from '@livekit/components-react';
import type { TrackReferenceOrPlaceholder } from '@livekit/components-core';

export interface ParticipantTileDescriptor {
    readonly id: string;
    readonly identity: string;
    readonly name: string;
    readonly isLocal: boolean;
    readonly videoTrack: TrackReferenceOrPlaceholder | null;
    readonly isVideoEnabled: boolean;
}

interface ParticipantGridProps {
    readonly showNames?: boolean;
    readonly participants: readonly ParticipantTileDescriptor[];
    readonly screenTrack: TrackReferenceOrPlaceholder | null;
}

const ParticipantPlaceholder: React.FC<{ readonly compact?: boolean }> = ({ compact = false }) => (
    <Box
        sx={{
            bgcolor: theme => alpha(theme.palette.background.default, 0.8),
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: compact ? 120 : 240,
            border: theme => `1px dashed ${alpha(theme.palette.divider, 0.6)}`
        }}
    >
        <Stack spacing={1} alignItems="center">
            <Avatar sx={{ width: compact ? 40 : 56, height: compact ? 40 : 56 }}>?</Avatar>
            <Typography variant="body2" color="text.secondary" textAlign="center">
                Waiting for participants to join…
            </Typography>
        </Stack>
    </Box>
);

const getInitials = (name: string): string => {
    const trimmed = name.trim();
    if (trimmed.length === 0) {
        return '?';
    }
    const parts = trimmed.split(/\s+/);
    const first = parts[0]?.charAt(0) ?? '';
    const second = parts.length > 1 ? (parts[parts.length - 1]?.charAt(0) ?? '') : '';
    const initials = `${first}${second}`.toUpperCase();
    return initials.length > 0 ? initials : trimmed.slice(0, 2).toUpperCase();
};

interface AudioOnlyTileProps {
    readonly participant: ParticipantTileDescriptor;
    readonly layout: 'grid' | 'list';
    readonly showName: boolean;
}

const AudioOnlyParticipantTile: React.FC<AudioOnlyTileProps> = ({
    participant,
    layout,
    showName
}) => {
    const isList = layout === 'list';
    return (
        <Box
            sx={{
                position: 'relative',
                borderRadius: isList ? 2 : 3,
                overflow: 'hidden',
                minHeight: isList ? 120 : { xs: 160, md: 200 },
                maxHeight: isList ? undefined : { xs: '32vh', md: '38vh' },
                aspectRatio: isList ? 'unset' : '16 / 9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                background: theme => alpha(theme.palette.common.white, 0.04),
                border: theme => `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
                px: isList ? 1.5 : 2.5,
                py: isList ? 1.5 : 2.5
            }}
        >
            <Stack spacing={1} alignItems="center" sx={{ width: '100%' }}>
                <Avatar
                    sx={{
                        width: isList ? 44 : 72,
                        height: isList ? 44 : 72,
                        fontSize: isList ? 18 : 24,
                        bgcolor: theme => alpha(theme.palette.primary.main, 0.25),
                        color: 'common.white',
                        border: theme => `1px solid ${alpha(theme.palette.common.white, 0.15)}`
                    }}
                >
                    {getInitials(participant.name)}
                </Avatar>
                {showName ? (
                    <Stack spacing={0.25} sx={{ width: '100%' }}>
                        <Typography
                            variant={isList ? 'body2' : 'subtitle1'}
                            fontWeight={600}
                            sx={{ color: 'common.white', wordBreak: 'break-word' }}
                        >
                            {participant.name}
                        </Typography>
                        {participant.isLocal ? (
                            <Typography variant="caption" sx={{ color: alpha('#ffffff', 0.75) }}>
                                You
                            </Typography>
                        ) : null}
                    </Stack>
                ) : null}
            </Stack>
        </Box>
    );
};

const VideoParticipantTile: React.FC<{
    readonly participant: ParticipantTileDescriptor;
    readonly layout: 'grid' | 'list';
}> = ({ participant, layout }) => {
    const isList = layout === 'list';
    return (
        <Box
            sx={{
                position: 'relative',
                borderRadius: isList ? 2 : 3,
                overflow: 'hidden',
                minHeight: isList ? 120 : { xs: 160, md: 200 },
                maxHeight: isList ? undefined : { xs: '32vh', md: '38vh' },
                aspectRatio: isList ? 'unset' : '16 / 9',
                border: theme => `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
                backgroundImage: theme =>
                    `linear-gradient(135deg, ${alpha(theme.palette.common.white, 0.04)}, ${alpha(theme.palette.common.white, 0.02)})`
            }}
        >
            <ParticipantTile
                trackRef={participant.videoTrack!}
                disableSpeakingIndicator={false}
                style={{ width: '100%', height: '100%' }}
            />
        </Box>
    );
};

export const ParticipantMediaTile: React.FC<{
    readonly participant: ParticipantTileDescriptor;
    readonly layout: 'grid' | 'list';
    readonly showName: boolean;
}> = ({ participant, layout, showName }) => {
    const shouldRenderVideo = Boolean(participant.videoTrack) && participant.isVideoEnabled;
    if (shouldRenderVideo) {
        return <VideoParticipantTile participant={participant} layout={layout} />;
    }
    return (
        <AudioOnlyParticipantTile participant={participant} layout={layout} showName={showName} />
    );
};

const getTrackKey = (track: TrackReferenceOrPlaceholder, index: number): string => {
    const sid = track.publication?.trackSid;
    if (sid) {
        return sid;
    }
    const participantId = track.participant?.identity ?? track.participant?.sid ?? 'unknown';
    return `${participantId}-${track.source}-${index}`;
};

export const ParticipantGrid: React.FC<ParticipantGridProps> = ({
    showNames = true,
    participants,
    screenTrack
}) => {
    const hasParticipants = participants.length > 0;

    if (screenTrack) {
        const hasSideTiles = participants.length > 0;
        return (
            <Stack
                direction={{ xs: 'column', lg: 'row' }}
                spacing={2}
                sx={{
                    position: 'relative',
                    width: '100%',
                    height: '100%',
                    flex: 1,
                    overflow: 'hidden'
                }}
            >
                <Box
                    key={getTrackKey(screenTrack, -1)}
                    sx={{
                        flex: { xs: '1 1 auto', lg: '1 1 0' },
                        minHeight: { xs: 240, md: 360 },
                        maxHeight: { xs: '70vh', lg: '100%' },
                        borderRadius: 3,
                        overflow: 'hidden',
                        position: 'relative',
                        border: theme => `1px solid ${alpha(theme.palette.common.white, 0.12)}`,
                        boxShadow: theme =>
                            `0 18px 45px ${alpha(theme.palette.common.black, 0.35)}`,
                        bgcolor: theme => alpha(theme.palette.common.black, 0.65),
                        display: 'flex',
                        alignItems: 'stretch',
                        justifyContent: 'stretch',
                        '& video, & canvas': {
                            objectFit: 'contain'
                        }
                    }}
                >
                    <ParticipantTile
                        trackRef={screenTrack}
                        disableSpeakingIndicator={false}
                        style={{ width: '100%', height: '100%' }}
                    />
                    <Box
                        sx={{
                            position: 'absolute',
                            left: 16,
                            bottom: 16,
                            px: 1.5,
                            py: 0.5,
                            borderRadius: 999,
                            bgcolor: theme => alpha(theme.palette.common.black, 0.55)
                        }}
                    >
                        <Typography
                            variant="caption"
                            sx={{ color: 'common.white', fontWeight: 600 }}
                        >
                            {screenTrack.participant?.name ?? 'Screen share'}
                        </Typography>
                    </Box>
                </Box>

                <Box
                    sx={{
                        flex: { xs: '0 0 auto', lg: '0 0 320px' },
                        maxHeight: { xs: '35vh', lg: '100%' },
                        borderRadius: 3,
                        border: theme => `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
                        backdropFilter: 'blur(12px)',
                        bgcolor: theme => alpha(theme.palette.common.black, 0.35),
                        p: 1.5,
                        overflowY: 'auto'
                    }}
                >
                    {hasSideTiles ? (
                        <Stack spacing={1.5}>
                            {participants.map(participant => (
                                <ParticipantMediaTile
                                    key={participant.id}
                                    participant={participant}
                                    layout="list"
                                    showName={showNames}
                                />
                            ))}
                        </Stack>
                    ) : (
                        <ParticipantPlaceholder compact />
                    )}
                </Box>
            </Stack>
        );
    }

    return (
        <Box
            sx={{
                position: 'relative',
                width: '100%',
                flex: 1,
                height: '100%',
                display: 'grid',
                gridTemplateColumns: {
                    xs: 'repeat(auto-fit, minmax(160px, 1fr))',
                    sm: 'repeat(auto-fit, minmax(200px, 1fr))',
                    lg: 'repeat(auto-fit, minmax(220px, 1fr))'
                },
                gridAutoRows: {
                    xs: 'minmax(160px, auto)',
                    md: 'minmax(200px, auto)'
                },
                gridAutoFlow: 'dense',
                alignContent: 'start',
                alignItems: 'stretch',
                gap: 2,
                p: 2,
                overflowY: 'auto'
            }}
        >
            {!hasParticipants ? <ParticipantPlaceholder /> : null}
            {participants.map(participant => (
                <ParticipantMediaTile
                    key={participant.id}
                    participant={participant}
                    layout="grid"
                    showName={showNames}
                />
            ))}
        </Box>
    );
};
