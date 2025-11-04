import React from 'react';
import {
    Alert,
    Avatar,
    AvatarGroup,
    Box,
    Button,
    Chip,
    CircularProgress,
    Paper,
    Stack,
    Switch,
    TextField,
    Tooltip,
    Typography
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import PhoneIcon from '@mui/icons-material/Phone';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import CallEndIcon from '@mui/icons-material/CallEnd';
import EventIcon from '@mui/icons-material/Event';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useAuthStore } from 'store/auth-store';
import { useUserDirectory } from 'features/users/hooks/useUserDirectory';
import { CallTypeBadge } from '../components/CallTypeBadge';
import { CallStatusChip } from '../components/CallStatusChip';
import { CallParticipantSelector } from '../components/CallParticipantSelector';
import { useCalls } from '../hooks/useCalls';
import { useCallOverlay } from '../providers/CallOverlayProvider';
import type { CallSummary, CallType } from '../types/call';

const toLocalDateTimeInputValue = (date: Date): string => format(date, "yyyy-MM-dd'T'HH:mm");

const formatDateTime = (value?: string | null): string | null => {
    if (!value) {
        return null;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return null;
    }
    return format(date, 'MMM d, yyyy • HH:mm');
};

const getDisplayName = (firstName?: string, lastName?: string, fallbackEmail?: string): string => {
    const name = `${firstName ?? ''} ${lastName ?? ''}`.trim();
    if (name.length > 0) {
        return name;
    }
    if (fallbackEmail) {
        return fallbackEmail;
    }
    return 'Unknown user';
};

const useCameraPreview = (
    enabled: boolean
): {
    readonly videoRef: React.RefObject<HTMLVideoElement | null>;
    readonly isLoading: boolean;
    readonly error: string | null;
    readonly needsManualStart: boolean;
    readonly requestManualStart: () => Promise<void>;
} => {
    const videoRef = React.useRef<HTMLVideoElement | null>(null);
    const streamRef = React.useRef<MediaStream | null>(null);
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [needsManualStart, setNeedsManualStart] = React.useState(false);

    const attemptPlay = React.useCallback(async (): Promise<void> => {
        const element = videoRef.current;
        if (!element) {
            return;
        }
        try {
            await element.play();
            setNeedsManualStart(false);
            setError(null);
        } catch (playError) {
            console.warn('Failed to start camera playback', playError);
            setNeedsManualStart(true);
            setError(null);
        }
    }, []);

    React.useEffect(() => {
        let active = true;

        const stopStream = (): void => {
            if (!streamRef.current) {
                return;
            }
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
            setNeedsManualStart(false);
        };

        const startPreview = async (): Promise<void> => {
            if (!enabled) {
                stopStream();
                setError(null);
                setNeedsManualStart(false);
                return;
            }

            setIsLoading(true);
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: false
                });
                if (!active) {
                    stream.getTracks().forEach(track => track.stop());
                    return;
                }
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    await attemptPlay();
                }
                setError(null);
            } catch (previewError) {
                console.warn('Failed to start camera preview', previewError);
                setError('Unable to access the camera. Check browser permissions.');
            } finally {
                if (active) {
                    setIsLoading(false);
                }
            }
        };

        void startPreview();

        return () => {
            active = false;
            stopStream();
        };
    }, [attemptPlay, enabled]);

    return {
        videoRef,
        isLoading,
        error,
        needsManualStart,
        requestManualStart: attemptPlay
    } as const;
};

const CameraPreview: React.FC<{ readonly enabled: boolean }> = ({ enabled }) => {
    const theme = useTheme();
    const { videoRef, isLoading, error, needsManualStart, requestManualStart } =
        useCameraPreview(enabled);
    const manualStartOverlayVisible = enabled && needsManualStart;

    return (
        <Box
            sx={{
                position: 'relative',
                width: '100%',
                aspectRatio: '16 / 9',
                borderRadius: 3,
                overflow: 'hidden',
                bgcolor: alpha(theme.palette.common.black, 0.8),
                border: `1px solid ${alpha(theme.palette.common.white, 0.08)}`
            }}
        >
            {enabled && !error ? (
                <video
                    ref={videoRef}
                    muted
                    playsInline
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
            ) : (
                <Stack
                    spacing={1}
                    alignItems="center"
                    justifyContent="center"
                    sx={{
                        position: 'absolute',
                        inset: 0,
                        color: 'common.white',
                        bgcolor: alpha(theme.palette.common.black, 0.6)
                    }}
                >
                    <VideocamOffIcon fontSize="large" />
                    <Typography variant="body2">
                        {enabled ? 'Camera preview unavailable' : 'Camera preview is off'}
                    </Typography>
                    {error ? (
                        <Typography variant="caption" color="error.light" textAlign="center">
                            {error}
                        </Typography>
                    ) : null}
                </Stack>
            )}
            {isLoading ? (
                <Stack
                    spacing={1}
                    alignItems="center"
                    justifyContent="center"
                    sx={{
                        position: 'absolute',
                        inset: 0,
                        bgcolor: alpha(theme.palette.common.black, 0.35),
                        color: 'common.white'
                    }}
                >
                    <CircularProgress size={32} color="inherit" />
                    <Typography variant="body2">Connecting to camera…</Typography>
                </Stack>
            ) : null}
            {manualStartOverlayVisible ? (
                <Stack
                    spacing={1}
                    alignItems="center"
                    justifyContent="center"
                    sx={{
                        position: 'absolute',
                        inset: 0,
                        bgcolor: alpha(theme.palette.common.black, 0.5),
                        color: 'common.white',
                        textAlign: 'center',
                        p: 3
                    }}
                >
                    <Typography variant="body2">
                        Your browser blocked the camera preview. Enable it to see yourself before
                        joining.
                    </Typography>
                    <Button
                        variant="contained"
                        size="small"
                        onClick={() => {
                            void requestManualStart();
                        }}
                    >
                        Enable preview
                    </Button>
                </Stack>
            ) : null}
        </Box>
    );
};

interface DeviceToggleCardProps {
    readonly checked: boolean;
    readonly onChange: (next: boolean) => void;
    readonly label: string;
    readonly description: string;
    readonly icon: React.ReactNode;
    readonly inactiveIcon?: React.ReactNode;
}

const DeviceToggleCard: React.FC<DeviceToggleCardProps> = ({
    checked,
    onChange,
    label,
    description,
    icon,
    inactiveIcon
}) => {
    const theme = useTheme();
    return (
        <Paper
            variant="outlined"
            sx={{
                px: 2,
                py: 1.75,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                borderRadius: 2,
                transition:
                    'border-color 0.2s ease, background-color 0.2s ease, transform 0.2s ease',
                borderColor: checked
                    ? alpha(theme.palette.primary.main, 0.5)
                    : theme.palette.divider,
                bgcolor: checked
                    ? alpha(theme.palette.primary.main, 0.08)
                    : theme.palette.background.paper,
                '&:hover': {
                    transform: 'translateY(-2px)'
                }
            }}
        >
            <Box
                sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    display: 'grid',
                    placeItems: 'center',
                    bgcolor: checked
                        ? alpha(theme.palette.primary.main, 0.15)
                        : alpha(theme.palette.text.secondary, 0.08),
                    color: checked ? theme.palette.primary.main : theme.palette.text.secondary
                }}
            >
                {checked ? icon : (inactiveIcon ?? icon)}
            </Box>
            <Box sx={{ flexGrow: 1 }}>
                <Typography variant="subtitle2" fontWeight={600}>
                    {label}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    {description}
                </Typography>
            </Box>
            <Switch
                checked={checked}
                onChange={(_, value) => onChange(value)}
                color="primary"
                inputProps={{ 'aria-label': label }}
            />
        </Paper>
    );
};

interface PreCallDeviceSettingsProps {
    readonly videoEnabled: boolean;
    readonly audioEnabled: boolean;
    readonly onVideoChange: (next: boolean) => void;
    readonly onAudioChange: (next: boolean) => void;
}

const PreCallDeviceSettings: React.FC<PreCallDeviceSettingsProps> = ({
    videoEnabled,
    audioEnabled,
    onVideoChange,
    onAudioChange
}) => (
    <Stack spacing={2}>
        <CameraPreview enabled={videoEnabled} />
        <Stack spacing={1.5}>
            <DeviceToggleCard
                checked={videoEnabled}
                onChange={onVideoChange}
                label="Enable camera"
                description="Let others see you when joining the call"
                icon={<VideocamIcon />}
                inactiveIcon={<VideocamOffIcon />}
            />
            <DeviceToggleCard
                checked={audioEnabled}
                onChange={onAudioChange}
                label="Enable microphone"
                description="Share your audio immediately when you join"
                icon={<MicIcon />}
                inactiveIcon={<MicOffIcon />}
            />
        </Stack>
    </Stack>
);

const CallCard: React.FC<{
    readonly call: CallSummary;
    readonly currentUserId: string | null;
    readonly onJoin: (call: CallSummary) => void;
    readonly onResume: (call: CallSummary) => void;
    readonly onLeave: (call: CallSummary) => void;
    readonly onEnd: (call: CallSummary) => void;
    readonly isJoining: boolean;
    readonly isLeaving: boolean;
    readonly isEnding: boolean;
}> = ({
    call,
    currentUserId,
    onJoin,
    onResume,
    onLeave,
    onEnd,
    isJoining,
    isLeaving,
    isEnding
}) => {
    const isInitiator = currentUserId ? call.initiator.id === currentUserId : false;
    const participant = currentUserId
        ? call.participants.find(item => item.user.id === currentUserId)
        : undefined;
    const participantStatus = participant?.status ?? null;
    const isJoined = participantStatus === 'joined';

    const canJoin = call.status === 'active' && !isJoined;
    const canLeave = call.status === 'active' && isJoined;
    const canEnd = call.status === 'active' && isInitiator;
    const canResume = call.status === 'active' && isJoined;

    const scheduledText = formatDateTime(call.scheduledStartTime);
    const endedText = formatDateTime(call.endedAt);

    const participantsWithHost = React.useMemo(() => {
        const seenUserIds = new Set<string>();
        const items: Array<{
            readonly key: string;
            readonly displayName: string;
            readonly initials: string;
            readonly isHost: boolean;
        }> = [];

        const addParticipant = (
            userId: string,
            firstName?: string,
            lastName?: string,
            isHost: boolean = false
        ): void => {
            if (seenUserIds.has(userId)) {
                return;
            }
            seenUserIds.add(userId);
            const displayName = getDisplayName(firstName, lastName);
            const initials = displayName
                .split(' ')
                .filter(Boolean)
                .map(part => part.charAt(0).toUpperCase())
                .join('')
                .slice(0, 2);
            items.push({
                key: `${isHost ? 'host' : 'participant'}-${userId}`,
                displayName: isHost ? `${displayName} (Host)` : displayName,
                initials: initials.length > 0 ? initials : displayName.charAt(0).toUpperCase(),
                isHost
            });
        };

        addParticipant(call.initiator.id, call.initiator.firstName, call.initiator.lastName, true);
        for (const participantItem of call.participants) {
            addParticipant(
                participantItem.user.id,
                participantItem.user.firstName,
                participantItem.user.lastName,
                participantItem.user.id === call.initiator.id
            );
        }

        return items;
    }, [call.initiator, call.participants]);
    const displayTitle = call.title?.trim();
    const fallbackTitle = `${call.type === 'voice' ? 'Voice' : call.type === 'video' ? 'Video' : 'Screen share'} call`;
    const callIcon =
        call.type === 'voice' ? (
            <PhoneIcon />
        ) : call.type === 'video' ? (
            <VideocamIcon />
        ) : (
            <ScreenShareIcon />
        );

    return (
        <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Stack spacing={2}>
                <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    justifyContent="space-between"
                    gap={1.5}
                >
                    <Stack spacing={1}>
                        <Typography variant="h6" fontWeight={600} sx={{ wordBreak: 'break-word' }}>
                            {displayTitle && displayTitle.length > 0 ? displayTitle : fallbackTitle}
                        </Typography>
                        <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                            flexWrap="wrap"
                            useFlexGap
                        >
                            <CallStatusChip status={call.status} />
                            <CallTypeBadge type={call.type} />
                            {isInitiator ? <Chip label="Host" size="small" /> : null}
                            {isJoined && call.status === 'active' ? (
                                <Chip label="In call" size="small" color="success" />
                            ) : null}
                        </Stack>
                        {call.description ? (
                            <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ maxWidth: 560 }}
                            >
                                {call.description}
                            </Typography>
                        ) : null}
                        <Stack spacing={0.5}>
                            {scheduledText ? (
                                <Stack direction="row" spacing={0.75} alignItems="center">
                                    <EventIcon fontSize="small" color="primary" />
                                    <Typography variant="body2" color="text.secondary">
                                        Starts {scheduledText}
                                    </Typography>
                                </Stack>
                            ) : null}
                            {call.status === 'ended' && endedText ? (
                                <Typography variant="body2" color="text.secondary">
                                    Ended {endedText}
                                </Typography>
                            ) : null}
                        </Stack>
                    </Stack>
                    <Stack spacing={1} alignItems={{ xs: 'flex-start', sm: 'flex-end' }}>
                        {isInitiator ? (
                            <Typography variant="body2" color="text.secondary">
                                You scheduled this call
                            </Typography>
                        ) : null}
                        {call.status === 'active' && isJoined ? (
                            <Typography variant="body2" color="success.main">
                                You are in this call
                            </Typography>
                        ) : null}
                        <AvatarGroup
                            max={6}
                            sx={{ justifyContent: { xs: 'flex-start', sm: 'flex-end' } }}
                        >
                            {participantsWithHost.map(item => (
                                <Tooltip key={item.key} title={item.displayName} placement="top">
                                    <Avatar
                                        sx={
                                            item.isHost
                                                ? {
                                                      bgcolor: 'primary.main',
                                                      color: 'primary.contrastText'
                                                  }
                                                : undefined
                                        }
                                    >
                                        {item.initials}
                                    </Avatar>
                                </Tooltip>
                            ))}
                        </AvatarGroup>
                    </Stack>
                </Stack>

                <Stack direction="row" spacing={1} justifyContent="flex-end" flexWrap="wrap">
                    {canResume ? (
                        <Button
                            variant="contained"
                            startIcon={callIcon}
                            onClick={() => onResume(call)}
                            disabled={isJoining || isLeaving || isEnding}
                        >
                            Return to call
                        </Button>
                    ) : null}
                    {canJoin ? (
                        <Button
                            variant="contained"
                            startIcon={callIcon}
                            onClick={() => onJoin(call)}
                            disabled={isJoining || isLeaving || isEnding}
                        >
                            Join call
                        </Button>
                    ) : null}
                    {canLeave ? (
                        <Button
                            variant="outlined"
                            color="warning"
                            startIcon={<ExitToAppIcon />}
                            onClick={() => onLeave(call)}
                            disabled={isLeaving || isJoining || isEnding}
                        >
                            Leave call
                        </Button>
                    ) : null}
                    {canEnd ? (
                        <Button
                            variant="outlined"
                            color="error"
                            startIcon={<CallEndIcon />}
                            onClick={() => onEnd(call)}
                            disabled={isEnding || isJoining || isLeaving}
                        >
                            End call
                        </Button>
                    ) : null}
                </Stack>
            </Stack>
        </Paper>
    );
};

interface CallSectionProps {
    readonly title: string;
    readonly emptyMessage: string;
    readonly calls: CallSummary[];
    readonly currentUserId: string | null;
    readonly onJoin: (call: CallSummary) => void;
    readonly onResume: (call: CallSummary) => void;
    readonly onLeave: (call: CallSummary) => void;
    readonly onEnd: (call: CallSummary) => void;
    readonly isJoining: boolean;
    readonly isLeaving: boolean;
    readonly isEnding: boolean;
}

const CallSection: React.FC<CallSectionProps> = ({
    title,
    emptyMessage,
    calls,
    currentUserId,
    onJoin,
    onResume,
    onLeave,
    onEnd,
    isJoining,
    isLeaving,
    isEnding
}) => (
    <Stack spacing={2}>
        <Typography variant="h6" fontWeight={600}>
            {title}
        </Typography>
        {calls.length === 0 ? (
            <Alert severity="info">{emptyMessage}</Alert>
        ) : (
            <Stack spacing={2}>
                {calls.map(call => (
                    <CallCard
                        key={call.id}
                        call={call}
                        currentUserId={currentUserId}
                        onJoin={onJoin}
                        onResume={onResume}
                        onLeave={onLeave}
                        onEnd={onEnd}
                        isJoining={isJoining}
                        isLeaving={isLeaving}
                        isEnding={isEnding}
                    />
                ))}
            </Stack>
        )}
    </Stack>
);

export const CallsPage: React.FC = () => {
    const currentUserId = useAuthStore(state => state.user?.id ?? null);
    const { members, isLoading: isUserDirectoryLoading } = useUserDirectory();
    const { activeCalls, scheduledCalls, pastCalls, isLoading, isError, invalidate } = useCalls();
    const {
        state: { activeCallId },
        actions: {
            setActiveCallId: setOverlayActiveCallId,
            setSessionEnabled,
            setOverlayMode,
            setPendingJoinPreferences,
            resetOverlay: resetOverlayState
        },
        mutations: { startCall, scheduleCall, joinCall, leaveCall, endCall }
    } = useCallOverlay();

    const leaveCallById = React.useCallback(
        (callId: string, shouldReset: boolean) => {
            leaveCall.mutate(
                { callId },
                {
                    onSuccess: () => {
                        if (shouldReset) {
                            resetOverlayState();
                        }
                    }
                }
            );
        },
        [leaveCall, resetOverlayState]
    );

    const handleResume = React.useCallback(
        (call: CallSummary): void => {
            setPendingJoinPreferences(null);
            setOverlayActiveCallId(call.id);
            setSessionEnabled(true);
            setOverlayMode('full');
        },
        [setOverlayActiveCallId, setOverlayMode, setPendingJoinPreferences, setSessionEnabled]
    );

    const participantOptions = React.useMemo(
        () =>
            members
                .filter(member => member.id !== currentUserId)
                .map(member => ({
                    id: member.id,
                    name: getDisplayName(member.firstName, member.lastName, member.email),
                    email: member.email
                })),
        [members, currentUserId]
    );

    const [quickTitle, setQuickTitle] = React.useState('');
    const [quickVideoEnabled, setQuickVideoEnabled] = React.useState(true);
    const [quickAudioEnabled, setQuickAudioEnabled] = React.useState(true);
    const [quickParticipants, setQuickParticipants] = React.useState<string[]>([]);

    const [scheduleTitle, setScheduleTitle] = React.useState('');
    const [scheduleDescription, setScheduleDescription] = React.useState('');
    const [scheduleStart, setScheduleStart] = React.useState('');
    const [scheduleEnd, setScheduleEnd] = React.useState('');
    const [scheduleParticipants, setScheduleParticipants] = React.useState<string[]>([]);

    const determineCallType = React.useCallback((videoEnabled: boolean): CallType => {
        return videoEnabled ? 'video' : 'voice';
    }, []);

    const handleQuickStartSubmit = async (
        event: React.FormEvent<HTMLFormElement>
    ): Promise<void> => {
        event.preventDefault();
        try {
            const callType = determineCallType(quickVideoEnabled);
            const createdCall = await startCall.mutateAsync({
                type: callType,
                title: quickTitle,
                invitedUserIds: quickParticipants.filter(id => id !== currentUserId),
                withVideo: quickVideoEnabled,
                withAudio: quickAudioEnabled
            });
            if (createdCall?.id) {
                setPendingJoinPreferences({ mic: quickAudioEnabled, video: quickVideoEnabled });
                setOverlayActiveCallId(createdCall.id);
                setSessionEnabled(true);
                setOverlayMode('full');
            }
            setQuickTitle('');
            setQuickParticipants([]);
        } catch (error) {
            console.debug('Failed to start call', error);
        }
    };

    const handleScheduleSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
        event.preventDefault();

        const trimmedTitle = scheduleTitle.trim();
        if (!trimmedTitle) {
            toast.error('Add a title for the scheduled call');
            return;
        }

        if (!scheduleStart) {
            toast.error('Select a start time');
            return;
        }

        const startDate = new Date(scheduleStart);
        if (Number.isNaN(startDate.getTime())) {
            toast.error('Invalid start time');
            return;
        }

        let endIso: string | undefined;
        if (scheduleEnd) {
            const endDate = new Date(scheduleEnd);
            if (Number.isNaN(endDate.getTime())) {
                toast.error('Invalid end time');
                return;
            }
            if (endDate <= startDate) {
                toast.error('End time must be after the start time');
                return;
            }
            endIso = endDate.toISOString();
        }

        try {
            await scheduleCall.mutateAsync({
                type: 'video',
                title: trimmedTitle,
                description: scheduleDescription,
                scheduledStartTime: startDate.toISOString(),
                scheduledEndTime: endIso,
                invitedUserIds: scheduleParticipants.filter(id => id !== currentUserId)
            });
            setScheduleTitle('');
            setScheduleDescription('');
            setScheduleStart('');
            setScheduleEnd('');
            setScheduleParticipants([]);
        } catch (error) {
            console.debug('Failed to schedule call', error);
        }
    };

    const handleJoin = (call: CallSummary): void => {
        const withVideo = call.type !== 'voice';
        setPendingJoinPreferences({ mic: true, video: withVideo });
        setOverlayActiveCallId(call.id);
        setSessionEnabled(false);
        setOverlayMode('full');
        joinCall.reset();
        joinCall.mutate(
            {
                callId: call.id,
                withVideo,
                withAudio: true
            },
            {
                onSuccess: () => {
                    setSessionEnabled(true);
                },
                onError: () => {
                    resetOverlayState();
                }
            }
        );
    };

    const handleLeave = (call: CallSummary): void => {
        leaveCallById(call.id, call.id === activeCallId);
    };

    const handleEnd = (call: CallSummary): void => {
        endCall.mutate(
            { callId: call.id },
            {
                onSuccess: () => {
                    if (call.id === activeCallId) {
                        resetOverlayState();
                    }
                }
            }
        );
    };

    return (
        <>
            <Box sx={{ px: { xs: 2, md: 4 }, py: 3 }}>
                <Stack spacing={4}>
                    <Stack spacing={1}>
                        <Typography variant="h4" fontWeight={600}>
                            Calls
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Start impromptu calls or schedule upcoming meetings. Calls are not tied
                            to any workspace.
                        </Typography>
                    </Stack>

                    <Stack
                        direction={{ xs: 'column', md: 'row' }}
                        spacing={3}
                        alignItems="stretch"
                        sx={{ width: '100%' }}
                    >
                        <Box sx={{ flexBasis: { md: '40%' }, flexGrow: 1 }}>
                            <Paper
                                component="form"
                                onSubmit={event => {
                                    void handleQuickStartSubmit(event);
                                }}
                                variant="outlined"
                                sx={{
                                    p: 3,
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 2
                                }}
                            >
                                <Stack spacing={2} height="100%">
                                    <Stack spacing={0.5}>
                                        <Typography variant="h6" fontWeight={600}>
                                            Start a call now
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Choose the call type, invite teammates, and jump in
                                            right away.
                                        </Typography>
                                    </Stack>

                                    <TextField
                                        label="Title"
                                        placeholder="Daily check-in"
                                        value={quickTitle}
                                        onChange={event => setQuickTitle(event.target.value)}
                                        fullWidth
                                    />

                                    <PreCallDeviceSettings
                                        videoEnabled={quickVideoEnabled}
                                        audioEnabled={quickAudioEnabled}
                                        onVideoChange={setQuickVideoEnabled}
                                        onAudioChange={setQuickAudioEnabled}
                                    />

                                    <CallParticipantSelector
                                        value={quickParticipants}
                                        onChange={next => {
                                            setQuickParticipants(next);
                                        }}
                                        options={participantOptions}
                                        disabled={isUserDirectoryLoading}
                                        helperText="Optional"
                                    />

                                    <Box sx={{ flexGrow: 1 }} />

                                    <Button
                                        type="submit"
                                        variant="contained"
                                        startIcon={
                                            quickVideoEnabled ? <VideocamIcon /> : <PhoneIcon />
                                        }
                                        disabled={startCall.isPending}
                                    >
                                        {startCall.isPending ? 'Starting…' : 'Start call'}
                                    </Button>
                                </Stack>
                            </Paper>
                        </Box>

                        <Box sx={{ flexBasis: { md: '60%' }, flexGrow: 1 }}>
                            <Paper
                                component="form"
                                onSubmit={event => {
                                    void handleScheduleSubmit(event);
                                }}
                                variant="outlined"
                                sx={{
                                    p: 3,
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 2
                                }}
                            >
                                <Stack spacing={2} height="100%">
                                    <Stack spacing={0.5}>
                                        <Typography variant="h6" fontWeight={600}>
                                            Schedule a call
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Reserve time with your teammates and let Crewdo notify
                                            everyone.
                                        </Typography>
                                    </Stack>

                                    <TextField
                                        label="Title"
                                        required
                                        value={scheduleTitle}
                                        onChange={event => setScheduleTitle(event.target.value)}
                                        placeholder="Sprint planning"
                                        fullWidth
                                    />

                                    <TextField
                                        label="Description"
                                        multiline
                                        minRows={3}
                                        value={scheduleDescription}
                                        onChange={event =>
                                            setScheduleDescription(event.target.value)
                                        }
                                        placeholder="Agenda, goals, or anything else attendees should know"
                                        fullWidth
                                    />

                                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                        <TextField
                                            label="Starts"
                                            type="datetime-local"
                                            value={scheduleStart}
                                            onChange={event => setScheduleStart(event.target.value)}
                                            InputLabelProps={{ shrink: true }}
                                            fullWidth
                                            required
                                            inputProps={{
                                                min: toLocalDateTimeInputValue(new Date())
                                            }}
                                        />
                                        <TextField
                                            label="Ends"
                                            type="datetime-local"
                                            value={scheduleEnd}
                                            onChange={event => setScheduleEnd(event.target.value)}
                                            InputLabelProps={{ shrink: true }}
                                            fullWidth
                                            inputProps={{
                                                min: scheduleStart
                                                    ? scheduleStart
                                                    : toLocalDateTimeInputValue(new Date())
                                            }}
                                            helperText="Optional"
                                        />
                                    </Stack>

                                    <CallParticipantSelector
                                        value={scheduleParticipants}
                                        onChange={next => {
                                            setScheduleParticipants(next);
                                        }}
                                        options={participantOptions}
                                        disabled={isUserDirectoryLoading}
                                        helperText="Invitees receive a notification"
                                    />

                                    <Box sx={{ flexGrow: 1 }} />

                                    <Button
                                        type="submit"
                                        variant="contained"
                                        startIcon={<VideocamIcon />}
                                        disabled={scheduleCall.isPending}
                                    >
                                        {scheduleCall.isPending ? 'Scheduling…' : 'Schedule call'}
                                    </Button>
                                </Stack>
                            </Paper>
                        </Box>
                    </Stack>

                    {isLoading ? (
                        <Stack alignItems="center" py={6}>
                            <CircularProgress />
                        </Stack>
                    ) : isError ? (
                        <Alert
                            severity="error"
                            action={
                                <Button
                                    color="inherit"
                                    size="small"
                                    onClick={() => {
                                        void invalidate();
                                    }}
                                >
                                    Retry
                                </Button>
                            }
                        >
                            We could not load your calls. Try again in a moment.
                        </Alert>
                    ) : (
                        <Stack spacing={4}>
                            <CallSection
                                title="Active calls"
                                emptyMessage="No active calls right now. Start one above to get going."
                                calls={activeCalls}
                                currentUserId={currentUserId}
                                onJoin={handleJoin}
                                onResume={handleResume}
                                onLeave={handleLeave}
                                onEnd={handleEnd}
                                isJoining={joinCall.isPending}
                                isLeaving={leaveCall.isPending}
                                isEnding={endCall.isPending}
                            />
                            <CallSection
                                title="Upcoming calls"
                                emptyMessage="Scheduled calls will appear here."
                                calls={scheduledCalls}
                                currentUserId={currentUserId}
                                onJoin={handleJoin}
                                onResume={handleResume}
                                onLeave={handleLeave}
                                onEnd={handleEnd}
                                isJoining={joinCall.isPending}
                                isLeaving={leaveCall.isPending}
                                isEnding={endCall.isPending}
                            />
                            <CallSection
                                title="Recent calls"
                                emptyMessage="Completed calls will show up here for quick reference."
                                calls={pastCalls}
                                currentUserId={currentUserId}
                                onJoin={handleJoin}
                                onResume={handleResume}
                                onLeave={handleLeave}
                                onEnd={handleEnd}
                                isJoining={joinCall.isPending}
                                isLeaving={leaveCall.isPending}
                                isEnding={endCall.isPending}
                            />
                        </Stack>
                    )}
                </Stack>
            </Box>
        </>
    );
};
