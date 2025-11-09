import React from 'react';
import {
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    IconButton,
    Slide,
    Stack,
    Tooltip,
    Typography,
    useMediaQuery
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CallEndIcon from '@mui/icons-material/CallEnd';
import PictureInPictureAltOutlinedIcon from '@mui/icons-material/PictureInPictureAltOutlined';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare';
import { TransitionProps } from '@mui/material/transitions';
import {
    LiveKitRoom,
    ParticipantTile,
    RoomAudioRenderer,
    useLocalParticipant,
    useParticipants,
    useRoomContext,
    useTracks
} from '@livekit/components-react';
import { LocalParticipant, Room, Track } from 'livekit-client';
import type { TrackReferenceOrPlaceholder } from '@livekit/components-core';
import toast from 'react-hot-toast';
import { alpha } from '@mui/material/styles';
import { ActiveCallControls } from './ActiveCallControls';
import {
    ParticipantGrid,
    ParticipantMediaTile,
    type ParticipantTileDescriptor
} from './ParticipantGrid';
import type { CallSessionCredentials, CallSummary } from '../types/call';
import { CallStatusChip } from './CallStatusChip';
import { CallTypeBadge } from './CallTypeBadge';

interface CallRoomOverlayProps {
    readonly open: boolean;
    readonly call: CallSummary | null;
    readonly session: CallSessionCredentials | null;
    readonly onLeaveCall: () => void;
    readonly onClose: () => void;
    readonly onMinimize: () => void;
    readonly onExpand: () => void;
    readonly isLeaving: boolean;
    readonly isSessionLoading: boolean;
    readonly onUpdateParticipantState: (payload: {
        readonly callId: string;
        readonly isMuted?: boolean;
        readonly isVideoEnabled?: boolean;
        readonly isScreenSharing?: boolean;
    }) => void;
    readonly preferredMicEnabled?: boolean;
    readonly preferredCameraEnabled?: boolean;
    readonly mode: 'full' | 'docked';
}

interface CallRoomContentProps {
    readonly call: CallSummary;
    readonly session: CallSessionCredentials;
    readonly onLeaveCall: () => void;
    readonly onUpdateParticipantState: CallRoomOverlayProps['onUpdateParticipantState'];
    readonly preferredMicEnabled?: boolean;
    readonly preferredCameraEnabled?: boolean;
    readonly mode: 'full' | 'docked';
    readonly onExpand: () => void;
}

const Transition = React.forwardRef(function Transition(
    props: TransitionProps & { readonly children: React.ReactElement },
    ref: React.Ref<unknown>
) {
    return <Slide direction="up" ref={ref} {...props} />;
});
Transition.displayName = 'CallOverlayTransition';

const useDeviceLists = (): {
    readonly audioInputs: MediaDeviceInfo[];
    readonly audioOutputs: MediaDeviceInfo[];
    readonly videoInputs: MediaDeviceInfo[];
} => {
    const [audioInputs, setAudioInputs] = React.useState<MediaDeviceInfo[]>([]);
    const [audioOutputs, setAudioOutputs] = React.useState<MediaDeviceInfo[]>([]);
    const [videoInputs, setVideoInputs] = React.useState<MediaDeviceInfo[]>([]);

    React.useEffect(() => {
        let isMounted = true;

        const loadDevices = async (): Promise<void> => {
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                if (!isMounted) {
                    return;
                }
                setAudioInputs(devices.filter(device => device.kind === 'audioinput'));
                setAudioOutputs(devices.filter(device => device.kind === 'audiooutput'));
                setVideoInputs(devices.filter(device => device.kind === 'videoinput'));
            } catch (error) {
                console.warn('Failed to enumerate media devices', error);
            }
        };

        const handleDeviceChange = (): void => {
            void loadDevices();
        };

        void loadDevices();
        navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
        return () => {
            isMounted = false;
            navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
        };
    }, []);

    return { audioInputs, audioOutputs, videoInputs };
};

const ensureParticipantAudio = async (
    participant: LocalParticipant | null,
    nextState: boolean
): Promise<void> => {
    if (!participant) {
        return;
    }
    await participant.setMicrophoneEnabled(nextState);
};

const ensureParticipantVideo = async (
    participant: LocalParticipant | null,
    nextState: boolean
): Promise<void> => {
    if (!participant) {
        return;
    }
    await participant.setCameraEnabled(nextState);
};

const ensureScreenShare = async (
    participant: LocalParticipant | null,
    nextState: boolean
): Promise<void> => {
    if (!participant) {
        return;
    }
    await participant.setScreenShareEnabled(nextState);
};

const switchDevice = async (
    room: Room | undefined,
    kind: MediaDeviceKind,
    deviceId: string
): Promise<void> => {
    if (!room) {
        return;
    }
    try {
        await room.switchActiveDevice(kind, deviceId);
    } catch (error) {
        console.warn(`Failed to switch ${kind} to ${deviceId}`, error);
        toast.error('Unable to switch device');
    }
};

const CallRoomContent: React.FC<CallRoomContentProps> = ({
    call,
    session,
    onLeaveCall,
    onUpdateParticipantState,
    preferredMicEnabled,
    preferredCameraEnabled,
    mode,
    onExpand
}) => {
    const room = useRoomContext();
    const { localParticipant } = useLocalParticipant();
    const participants = useParticipants();
    const isMobile = useMediaQuery('(max-width:900px)');
    const { audioInputs, audioOutputs, videoInputs } = useDeviceLists();
    const activeLocalParticipant = React.useMemo(
        () => localParticipant ?? room?.localParticipant ?? null,
        [localParticipant, room]
    );

    const participantNameLookup = React.useMemo(() => {
        const lookup = new Map<string, string>();
        call.participants.forEach(participant => {
            const { user } = participant;
            if (!user?.id) {
                return;
            }
            const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
            lookup.set(user.id, fullName.length > 0 ? fullName : 'Participant');
        });
        const initiatorName =
            `${call.initiator.firstName ?? ''} ${call.initiator.lastName ?? ''}`.trim();
        if (call.initiator.id) {
            lookup.set(
                call.initiator.id,
                initiatorName.length > 0
                    ? initiatorName
                    : (lookup.get(call.initiator.id) ?? 'Participant')
            );
        }
        return lookup;
    }, [call.participants, call.initiator]);

    const [micEnabled, setMicEnabled] = React.useState<boolean>(true);
    const [videoEnabled, setVideoEnabled] = React.useState<boolean>(true);
    const [screenShareEnabled, setScreenShareEnabled] = React.useState<boolean>(false);
    const [selectedAudioInput, setSelectedAudioInput] = React.useState<string>('');
    const [selectedAudioOutput, setSelectedAudioOutput] = React.useState<string>('');
    const [selectedVideoDevice, setSelectedVideoDevice] = React.useState<string>('');
    const [hasAppliedPreferences, setHasAppliedPreferences] = React.useState(false);

    const tracks = useTracks(
        [
            { source: Track.Source.Camera, withPlaceholder: false },
            { source: Track.Source.ScreenShare, withPlaceholder: false }
        ],
        { onlySubscribed: false }
    );

    const screenTracks = React.useMemo(
        () => tracks.filter(track => track.source === Track.Source.ScreenShare),
        [tracks]
    );
    const cameraTracks = React.useMemo(
        () => tracks.filter(track => track.source === Track.Source.Camera),
        [tracks]
    );
    const cameraTrackByIdentity = React.useMemo(() => {
        const map = new Map<string, TrackReferenceOrPlaceholder>();
        cameraTracks.forEach(track => {
            const identity = track.participant?.identity;
            if (!identity) {
                return;
            }
            if (!map.has(identity)) {
                map.set(identity, track);
            }
        });
        return map;
    }, [cameraTracks]);
    const participantTiles = React.useMemo<ParticipantTileDescriptor[]>(() => {
        const unique = new Map<string, ParticipantTileDescriptor>();
        participants.forEach(participant => {
            const participantId = participant.sid ?? participant.identity;
            if (!participantId) {
                return;
            }
            if (unique.has(participantId)) {
                return;
            }
            const { identity } = participant;
            const fallbackName =
                participantNameLookup.get(identity) ?? participant.name ?? 'Participant';
            const isVideoEnabled = participant.isCameraEnabled;
            const videoTrack =
                identity && isVideoEnabled ? (cameraTrackByIdentity.get(identity) ?? null) : null;
            unique.set(participantId, {
                id: participantId,
                identity,
                name: fallbackName,
                isLocal: participant.isLocal,
                videoTrack,
                isVideoEnabled
            });
        });
        return Array.from(unique.values());
    }, [participants, participantNameLookup, cameraTrackByIdentity]);
    const primaryScreenTrack = React.useMemo(() => {
        const remoteShare = screenTracks.find(
            track => track.participant?.identity !== session.identity
        );
        return remoteShare ?? screenTracks[0] ?? null;
    }, [screenTracks, session.identity]);

    const anotherParticipantSharing = React.useMemo(
        () =>
            screenTracks.some(track => {
                const { participant } = track;
                if (!participant) {
                    return false;
                }
                if (participant.isLocal) {
                    return false;
                }
                return participant.identity !== session.identity;
            }),
        [screenTracks, session.identity]
    );

    const screenShareLocked = anotherParticipantSharing && !screenShareEnabled;
    const canShareScreen = screenShareEnabled || !anotherParticipantSharing;

    React.useEffect(() => {
        setHasAppliedPreferences(false);
    }, [call.id, preferredMicEnabled, preferredCameraEnabled]);

    React.useEffect(() => {
        if (!activeLocalParticipant) {
            return;
        }

        const updateStates = (): void => {
            setMicEnabled(activeLocalParticipant.isMicrophoneEnabled);
            setVideoEnabled(activeLocalParticipant.isCameraEnabled);
            setScreenShareEnabled(activeLocalParticipant.isScreenShareEnabled);
        };

        updateStates();

        activeLocalParticipant.on('trackMuted', updateStates);
        activeLocalParticipant.on('trackUnmuted', updateStates);
        activeLocalParticipant.on('localTrackPublished', updateStates);
        activeLocalParticipant.on('localTrackUnpublished', updateStates);

        return () => {
            activeLocalParticipant.off('trackMuted', updateStates);
            activeLocalParticipant.off('trackUnmuted', updateStates);
            activeLocalParticipant.off('localTrackPublished', updateStates);
            activeLocalParticipant.off('localTrackUnpublished', updateStates);
        };
    }, [activeLocalParticipant]);

    React.useEffect(() => {
        if (!activeLocalParticipant || hasAppliedPreferences) {
            return;
        }

        const applyPreferences = async (): Promise<void> => {
            try {
                if (typeof preferredMicEnabled === 'boolean') {
                    await ensureParticipantAudio(activeLocalParticipant, preferredMicEnabled);
                    setMicEnabled(preferredMicEnabled);
                    onUpdateParticipantState({
                        callId: call.id,
                        isMuted: !preferredMicEnabled
                    });
                }

                if (typeof preferredCameraEnabled === 'boolean') {
                    await ensureParticipantVideo(activeLocalParticipant, preferredCameraEnabled);
                    setVideoEnabled(preferredCameraEnabled);
                    onUpdateParticipantState({
                        callId: call.id,
                        isVideoEnabled: preferredCameraEnabled
                    });
                }
            } catch (error) {
                console.warn('Failed to apply device preferences', error);
            } finally {
                setHasAppliedPreferences(true);
            }
        };

        void applyPreferences();
    }, [
        call.id,
        activeLocalParticipant,
        preferredCameraEnabled,
        preferredMicEnabled,
        hasAppliedPreferences,
        onUpdateParticipantState
    ]);

    React.useEffect(() => {
        if (!selectedAudioInput && audioInputs.length > 0) {
            setSelectedAudioInput(audioInputs[0].deviceId);
        }
    }, [audioInputs, selectedAudioInput]);

    React.useEffect(() => {
        if (!selectedAudioOutput && audioOutputs.length > 0) {
            setSelectedAudioOutput(audioOutputs[0].deviceId);
        }
    }, [audioOutputs, selectedAudioOutput]);

    React.useEffect(() => {
        if (!selectedVideoDevice && videoInputs.length > 0) {
            setSelectedVideoDevice(videoInputs[0].deviceId);
        }
    }, [videoInputs, selectedVideoDevice]);

    const handleToggleMute = async (nextMuted: boolean): Promise<void> => {
        const participant = activeLocalParticipant;
        if (!participant) {
            toast.error('Microphone is not ready yet. Please wait a moment and try again.');
            return;
        }
        try {
            const shouldEnable = !nextMuted;
            await ensureParticipantAudio(participant, shouldEnable);
            setMicEnabled(shouldEnable);
            onUpdateParticipantState({ callId: call.id, isMuted: nextMuted });
        } catch (error) {
            console.error('Failed to toggle microphone', error);
            toast.error('Unable to toggle microphone');
            setMicEnabled(participant.isMicrophoneEnabled);
        }
    };

    const handleToggleVideo = async (next: boolean): Promise<void> => {
        const participant = activeLocalParticipant;
        if (!participant) {
            toast.error('Camera is not ready yet. Please wait a moment and try again.');
            return;
        }
        try {
            await ensureParticipantVideo(participant, next);
            setVideoEnabled(next);
            onUpdateParticipantState({ callId: call.id, isVideoEnabled: next });
        } catch (error) {
            console.error('Failed to toggle camera', error);
            toast.error('Unable to toggle camera');
            setVideoEnabled(participant.isCameraEnabled);
        }
    };

    const handleToggleScreenShare = async (next: boolean): Promise<void> => {
        if (next && screenShareLocked) {
            toast.error('Screen share is already in progress. Ask the presenter to stop first.');
            return;
        }
        const participant = activeLocalParticipant;
        if (!participant) {
            toast.error('Screen sharing is not ready yet. Please wait a moment and try again.');
            return;
        }
        try {
            await ensureScreenShare(participant, next);
            setScreenShareEnabled(next);
            onUpdateParticipantState({ callId: call.id, isScreenSharing: next });
        } catch (error) {
            console.error('Failed to toggle screen share', error);
            toast.error('Unable to toggle screen share');
            setScreenShareEnabled(participant.isScreenShareEnabled);
        }
    };

    const handleSelectAudioInput = (deviceId: string): void => {
        setSelectedAudioInput(deviceId);
        void switchDevice(room, 'audioinput', deviceId);
    };

    const handleSelectAudioOutput = (deviceId: string): void => {
        setSelectedAudioOutput(deviceId);
        void switchDevice(room, 'audiooutput', deviceId);
    };

    const handleSelectVideoDevice = (deviceId: string): void => {
        setSelectedVideoDevice(deviceId);
        void switchDevice(room, 'videoinput', deviceId);
    };

    const participantCount = call.participants.length;
    const activeParticipantIds = call.participants
        .filter(participant => participant.status === 'joined')
        .map(participant => participant.user.id);
    const isHost = call.initiator.id === session.identity;
    const localTile = React.useMemo(
        () => participantTiles.find(tile => tile.identity === session.identity) ?? null,
        [participantTiles, session.identity]
    );
    const dockedPreview = React.useMemo<
        | { kind: 'screen'; track: TrackReferenceOrPlaceholder }
        | { kind: 'participant'; tile: ParticipantTileDescriptor }
        | null
    >(() => {
        if (mode !== 'docked') {
            return null;
        }
        if (primaryScreenTrack) {
            return { kind: 'screen', track: primaryScreenTrack };
        }
        const tile = localTile ?? participantTiles[0] ?? null;
        if (!tile) {
            return null;
        }
        return { kind: 'participant', tile };
    }, [mode, primaryScreenTrack, localTile, participantTiles]);

    if (mode === 'docked') {
        return (
            <Box sx={{ p: 2, minWidth: 320, maxWidth: 380 }}>
                <RoomAudioRenderer />
                <Stack spacing={2}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Box>
                            <Typography variant="subtitle1" fontWeight={600}>
                                {call.title?.trim() ?? 'Call in progress'}
                            </Typography>
                            <Typography variant="caption" color={alpha('#ffffff', 0.65)}>
                                {participantCount} participant{participantCount === 1 ? '' : 's'}
                            </Typography>
                        </Box>
                        <Tooltip title="Return to full call view">
                            <IconButton
                                size="small"
                                onClick={onExpand}
                                sx={{
                                    bgcolor: alpha('#ffffff', 0.08),
                                    color: 'common.white',
                                    '&:hover': { bgcolor: alpha('#ffffff', 0.18) }
                                }}
                            >
                                <OpenInFullIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Stack>

                    <Box sx={{ borderRadius: 2, overflow: 'hidden', minHeight: 180 }}>
                        {dockedPreview ? (
                            dockedPreview.kind === 'screen' ? (
                                <ParticipantTile
                                    trackRef={dockedPreview.track}
                                    disableSpeakingIndicator={false}
                                />
                            ) : (
                                <ParticipantMediaTile
                                    participant={dockedPreview.tile}
                                    layout="list"
                                    showName={false}
                                />
                            )
                        ) : (
                            <Stack
                                alignItems="center"
                                justifyContent="center"
                                sx={{
                                    height: '100%',
                                    minHeight: 180,
                                    bgcolor: alpha('#ffffff', 0.04),
                                    border: theme =>
                                        `1px solid ${alpha(theme.palette.common.white, 0.08)}`
                                }}
                            >
                                <Typography variant="body2" color={alpha('#ffffff', 0.7)}>
                                    No live video
                                </Typography>
                            </Stack>
                        )}
                    </Box>
                    {dockedPreview ? (
                        dockedPreview.kind === 'screen' ? (
                            <Typography
                                variant="body2"
                                fontWeight={600}
                                sx={{ color: 'common.white', textAlign: 'center' }}
                            >
                                {dockedPreview.track.participant?.name ?? 'Screen share'}
                            </Typography>
                        ) : !dockedPreview.tile.isVideoEnabled ? (
                            <Typography
                                variant="body2"
                                fontWeight={600}
                                sx={{ color: 'common.white', textAlign: 'center' }}
                            >
                                {dockedPreview.tile.name}
                                {dockedPreview.tile.isLocal ? ' • You' : ''}
                            </Typography>
                        ) : null
                    ) : null}

                    <Stack
                        direction="row"
                        spacing={1.5}
                        alignItems="center"
                        justifyContent="space-between"
                    >
                        <Stack direction="row" spacing={1}>
                            <Tooltip title={micEnabled ? 'Mute microphone' : 'Unmute microphone'}>
                                <span>
                                    <IconButton
                                        size="medium"
                                        color={micEnabled ? 'primary' : 'error'}
                                        onClick={() => {
                                            void handleToggleMute(!micEnabled);
                                        }}
                                    >
                                        {micEnabled ? <MicIcon /> : <MicOffIcon />}
                                    </IconButton>
                                </span>
                            </Tooltip>
                            <Tooltip title={videoEnabled ? 'Turn off camera' : 'Turn on camera'}>
                                <span>
                                    <IconButton
                                        size="medium"
                                        color={videoEnabled ? 'primary' : 'default'}
                                        onClick={() => {
                                            void handleToggleVideo(!videoEnabled);
                                        }}
                                    >
                                        {videoEnabled ? <VideocamIcon /> : <VideocamOffIcon />}
                                    </IconButton>
                                </span>
                            </Tooltip>
                            <Tooltip
                                title={
                                    screenShareEnabled
                                        ? 'Stop sharing screen'
                                        : screenShareLocked
                                          ? 'Screen share is already in progress'
                                          : 'Share your screen'
                                }
                            >
                                <span>
                                    <IconButton
                                        size="medium"
                                        color={screenShareEnabled ? 'success' : 'default'}
                                        onClick={() => {
                                            void handleToggleScreenShare(!screenShareEnabled);
                                        }}
                                        disabled={
                                            !canShareScreen ||
                                            (screenShareLocked && !screenShareEnabled)
                                        }
                                    >
                                        {screenShareEnabled ? (
                                            <StopScreenShareIcon />
                                        ) : (
                                            <ScreenShareIcon />
                                        )}
                                    </IconButton>
                                </span>
                            </Tooltip>
                        </Stack>

                        <Button
                            variant="contained"
                            color="error"
                            size="small"
                            startIcon={<CallEndIcon fontSize="small" />}
                            onClick={onLeaveCall}
                        >
                            Leave
                        </Button>
                    </Stack>
                    {screenShareLocked && !screenShareEnabled ? (
                        <Typography variant="caption" color={alpha('#ffffff', 0.75)}>
                            Someone else is sharing their screen
                        </Typography>
                    ) : null}
                </Stack>
            </Box>
        );
    }

    return (
        <Stack sx={{ height: '100%' }} spacing={2}>
            <RoomAudioRenderer />
            <Stack
                spacing={1}
                direction={{ xs: 'column', md: 'row' }}
                alignItems={{ xs: 'flex-start', md: 'center' }}
                justifyContent="space-between"
                px={{ xs: 2, md: 3 }}
                pt={1}
            >
                <Stack spacing={0.5}>
                    <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight={600}>
                        {call.title?.trim() ?? 'Untitled call'}
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <CallStatusChip status={call.status} />
                        <CallTypeBadge type={call.type} />
                        <Chip label={`${participantCount} participants`} size="small" />
                        {isHost ? <Chip label="Host" size="small" color="primary" /> : null}
                        {screenShareLocked && !screenShareEnabled ? (
                            <Chip
                                label="Screen share active"
                                size="small"
                                color="secondary"
                                variant="outlined"
                            />
                        ) : null}
                    </Stack>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                    {call.participants.map(participant => (
                        <Chip
                            key={participant.id}
                            label={
                                `${participant.user.firstName ?? ''} ${participant.user.lastName ?? ''}`.trim() ||
                                'Guest'
                            }
                            color={
                                activeParticipantIds.includes(participant.user.id)
                                    ? 'success'
                                    : 'default'
                            }
                            size="small"
                        />
                    ))}
                </Stack>
            </Stack>

            <Box sx={{ flex: 1, minHeight: 0 }}>
                <ParticipantGrid
                    showNames={!isMobile}
                    participants={participantTiles}
                    screenTrack={primaryScreenTrack}
                />
            </Box>

            <ActiveCallControls
                onLeave={onLeaveCall}
                onToggleMute={handleToggleMute}
                onToggleVideo={handleToggleVideo}
                onToggleScreenShare={handleToggleScreenShare}
                muted={!micEnabled}
                videoEnabled={videoEnabled}
                screenShareEnabled={screenShareEnabled}
                canShareScreen={canShareScreen}
                screenShareLocked={screenShareLocked}
                audioInputDevices={audioInputs}
                audioOutputDevices={audioOutputs}
                videoDevices={videoInputs}
                selectedAudioInputId={selectedAudioInput}
                selectedAudioOutputId={selectedAudioOutput}
                selectedVideoDeviceId={selectedVideoDevice}
                onSelectAudioInput={handleSelectAudioInput}
                onSelectAudioOutput={handleSelectAudioOutput}
                onSelectVideoDevice={handleSelectVideoDevice}
            />
        </Stack>
    );
};

export const CallRoomOverlay: React.FC<CallRoomOverlayProps> = ({
    open,
    call,
    session,
    onLeaveCall,
    onClose,
    onMinimize,
    onExpand,
    isLeaving,
    isSessionLoading,
    onUpdateParticipantState,
    preferredMicEnabled,
    preferredCameraEnabled,
    mode
}) => {
    const titleText = call?.title?.trim() ?? 'Call in progress';
    const canLeave = Boolean(call);
    const isDocked = mode === 'docked';
    const resolvedAudioEnabled =
        typeof preferredMicEnabled === 'boolean' ? preferredMicEnabled : true;
    const resolvedVideoEnabled =
        typeof preferredCameraEnabled === 'boolean'
            ? preferredCameraEnabled
            : call?.type === 'voice'
              ? false
              : true;

    React.useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }
        if (!open || mode !== 'docked') {
            return;
        }
        const { body } = window.document;
        const previousOverflow = body.style.overflow;
        const previousPaddingRight = body.style.paddingRight;

        body.style.overflow = '';
        body.style.paddingRight = '';

        return () => {
            body.style.overflow = previousOverflow;
            body.style.paddingRight = previousPaddingRight;
        };
    }, [mode, open]);
    const handleDialogClose = React.useCallback(
        (_event: React.SyntheticEvent, reason: 'backdropClick' | 'escapeKeyDown') => {
            if (isDocked && reason === 'backdropClick') {
                return;
            }
            onClose();
        },
        [isDocked, onClose]
    );

    return (
        <Dialog
            open={open}
            onClose={handleDialogClose}
            TransitionComponent={Transition}
            keepMounted
            maxWidth={false}
            fullScreen={!isDocked}
            hideBackdrop={isDocked}
            disableScrollLock={isDocked}
            disableEnforceFocus={isDocked}
            disableAutoFocus={isDocked}
            disableRestoreFocus={isDocked}
            PaperProps={{
                sx: isDocked
                    ? {
                          width: 380,
                          maxWidth: 'calc(100% - 32px)',
                          bgcolor: alpha('#0b1120', 0.92),
                          color: 'common.white',
                          borderRadius: 3,
                          border: theme => `1px solid ${alpha(theme.palette.common.white, 0.12)}`,
                          boxShadow: theme => theme.shadows[20],
                          margin: 0,
                          position: 'fixed',
                          bottom: 24,
                          right: 24,
                          overflow: 'hidden',
                          pointerEvents: 'auto'
                      }
                    : {
                          backgroundImage:
                              'radial-gradient(circle at 15% 10%, rgba(86,108,255,0.28) 0%, rgba(10,12,24,0.96) 42%, rgba(5,6,12,1) 100%)',
                          color: 'common.white'
                      }
            }}
            slotProps={
                isDocked
                    ? {
                          backdrop: {
                              invisible: true
                          },
                          root: {
                              sx: {
                                  pointerEvents: 'none'
                              }
                          }
                      }
                    : undefined
            }
        >
            <Box
                sx={{
                    height: isDocked ? 'auto' : '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: 0
                }}
            >
                {!isDocked ? (
                    <Box
                        sx={{
                            px: { xs: 1.5, md: 3 },
                            pt: { xs: 1.5, md: 2.5 },
                            pb: { xs: 1, md: 1.5 }
                        }}
                    >
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 2
                            }}
                        >
                            <Stack direction="row" spacing={1} alignItems="center">
                                <Tooltip title="Close overlay">
                                    <IconButton
                                        onClick={onClose}
                                        aria-label="close call overlay"
                                        sx={{
                                            bgcolor: alpha('#ffffff', 0.08),
                                            color: 'common.white',
                                            borderRadius: 2,
                                            backdropFilter: 'blur(16px)',
                                            '&:hover': { bgcolor: alpha('#ffffff', 0.16) }
                                        }}
                                    >
                                        <CloseIcon />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Minimize call">
                                    <span>
                                        <IconButton
                                            onClick={onMinimize}
                                            aria-label="minimize call"
                                            disabled={isLeaving}
                                            sx={{
                                                bgcolor: alpha('#ffffff', 0.08),
                                                color: 'common.white',
                                                borderRadius: 2,
                                                backdropFilter: 'blur(16px)',
                                                '&:hover': { bgcolor: alpha('#ffffff', 0.16) },
                                                '&.Mui-disabled': {
                                                    color: alpha('#ffffff', 0.4)
                                                }
                                            }}
                                        >
                                            <PictureInPictureAltOutlinedIcon />
                                        </IconButton>
                                    </span>
                                </Tooltip>
                            </Stack>

                            <Typography
                                variant="subtitle1"
                                fontWeight={600}
                                sx={{
                                    flex: 1,
                                    textAlign: 'center',
                                    color: alpha('#ffffff', 0.85)
                                }}
                            >
                                {titleText}
                            </Typography>

                            <Tooltip title="Leave call">
                                <span>
                                    <IconButton
                                        onClick={onLeaveCall}
                                        aria-label="leave call"
                                        disabled={isLeaving || !canLeave}
                                        sx={{
                                            bgcolor: alpha('#ff5263', 0.28),
                                            color: 'common.white',
                                            borderRadius: 2,
                                            backdropFilter: 'blur(14px)',
                                            '&:hover': { bgcolor: alpha('#ff5263', 0.4) },
                                            '&.Mui-disabled': {
                                                color: alpha('#ffffff', 0.4)
                                            }
                                        }}
                                    >
                                        <CallEndIcon />
                                    </IconButton>
                                </span>
                            </Tooltip>
                        </Box>
                    </Box>
                ) : null}

                <Box
                    sx={{
                        flex: isDocked ? 'unset' : 1,
                        minHeight: isDocked ? 'auto' : 0,
                        display: 'flex',
                        flexDirection: 'column'
                    }}
                >
                    {isSessionLoading ? (
                        <Stack
                            spacing={2}
                            alignItems="center"
                            justifyContent="center"
                            sx={{ flex: 1, px: 3, py: 4, textAlign: 'center' }}
                        >
                            <CircularProgress color="inherit" size={isDocked ? 28 : 36} />
                            <Typography variant="body2" sx={{ color: alpha('#ffffff', 0.7) }}>
                                Connecting to call…
                            </Typography>
                        </Stack>
                    ) : !call || !session ? (
                        <Stack
                            spacing={2.5}
                            alignItems="center"
                            justifyContent="center"
                            sx={{ flex: 1, px: 4, py: 5, textAlign: 'center' }}
                        >
                            <Typography
                                variant="h5"
                                fontWeight={700}
                                sx={{ color: 'common.white' }}
                            >
                                Media service unavailable
                            </Typography>
                            <Typography
                                variant="body2"
                                sx={{ color: alpha('#ffffff', 0.75), maxWidth: 420 }}
                            >
                                We could not get the credentials required to join this call. Try
                                again later or contact your administrator.
                            </Typography>
                        </Stack>
                    ) : (
                        <LiveKitRoom
                            token={session.token}
                            serverUrl={session.url}
                            connectOptions={{
                                autoSubscribe: true
                            }}
                            video={resolvedVideoEnabled}
                            audio={resolvedAudioEnabled}
                            onDisconnected={onClose}
                        >
                            <CallRoomContent
                                call={call}
                                session={session}
                                onLeaveCall={onLeaveCall}
                                onUpdateParticipantState={onUpdateParticipantState}
                                preferredMicEnabled={preferredMicEnabled}
                                preferredCameraEnabled={preferredCameraEnabled}
                                mode={mode}
                                onExpand={onExpand}
                            />
                        </LiveKitRoom>
                    )}
                </Box>
            </Box>
        </Dialog>
    );
};
