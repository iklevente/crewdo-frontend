import React from 'react';
import {
    Avatar,
    Box,
    Dialog,
    DialogContent,
    IconButton,
    Stack,
    Switch,
    Typography,
    useTheme
} from '@mui/material';
import PhoneIcon from '@mui/icons-material/Phone';
import PhoneDisabledIcon from '@mui/icons-material/PhoneDisabled';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';

export interface IncomingCallData {
    readonly id: string;
    readonly title?: string;
    readonly type: 'voice' | 'video';
    readonly initiator: {
        readonly id: string;
        readonly firstName: string;
        readonly lastName: string;
        readonly avatar?: string;
    };
}

interface IncomingCallModalProps {
    readonly open: boolean;
    readonly call: IncomingCallData | null;
    readonly onAccept: (
        callId: string,
        options: { withVideo: boolean; withAudio: boolean }
    ) => void;
    readonly onDecline: (callId: string) => void;
}

export const IncomingCallModal: React.FC<IncomingCallModalProps> = ({
    open,
    call,
    onAccept,
    onDecline
}) => {
    const theme = useTheme();
    const [videoEnabled, setVideoEnabled] = React.useState(false);
    const [audioEnabled, setAudioEnabled] = React.useState(true);

    React.useEffect(() => {
        if (call) {
            // Default video to on if it's a video call
            setVideoEnabled(call.type === 'video');
            setAudioEnabled(true);
        }
    }, [call]);

    if (!call) {
        return null;
    }

    const initiatorName = `${call.initiator.firstName} ${call.initiator.lastName}`.trim();
    const callTypeLabel = call.type === 'video' ? 'Video Call' : 'Voice Call';

    const handleAccept = (): void => {
        onAccept(call.id, { withVideo: videoEnabled, withAudio: audioEnabled });
    };

    const handleDecline = (): void => {
        onDecline(call.id);
    };

    return (
        <Dialog
            open={open}
            onClose={handleDecline}
            maxWidth="xs"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 3,
                    background:
                        theme.palette.mode === 'dark'
                            ? 'linear-gradient(135deg, #1a237e 0%, #0d47a1 100%)'
                            : 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)'
                }
            }}
        >
            <DialogContent sx={{ py: 4, px: 3 }}>
                <Stack spacing={3} alignItems="center">
                    {/* Avatar */}
                    <Box
                        sx={{
                            position: 'relative',
                            animation: 'pulse 2s ease-in-out infinite',
                            '@keyframes pulse': {
                                '0%, 100%': {
                                    transform: 'scale(1)',
                                    opacity: 1
                                },
                                '50%': {
                                    transform: 'scale(1.05)',
                                    opacity: 0.9
                                }
                            }
                        }}
                    >
                        <Avatar
                            sx={{
                                width: 96,
                                height: 96,
                                bgcolor: 'background.paper',
                                color: 'primary.main',
                                fontSize: '2.5rem',
                                fontWeight: 600,
                                border: `4px solid ${theme.palette.background.paper}`
                            }}
                            src={call.initiator.avatar}
                        >
                            {initiatorName[0]?.toUpperCase() ?? 'U'}
                        </Avatar>
                    </Box>

                    {/* Caller Info */}
                    <Stack spacing={0.5} alignItems="center">
                        <Typography variant="h5" fontWeight={600} color="white" textAlign="center">
                            {initiatorName.length > 0 ? initiatorName : 'Unknown Caller'}
                        </Typography>
                        <Typography variant="body2" color="rgba(255, 255, 255, 0.8)">
                            {call.title ?? callTypeLabel}
                        </Typography>
                        <Typography
                            variant="caption"
                            color="rgba(255, 255, 255, 0.6)"
                            sx={{ mt: 1 }}
                        >
                            Incoming {callTypeLabel}
                        </Typography>
                    </Stack>

                    {/* Media Controls */}
                    <Box
                        sx={{
                            width: '100%',
                            bgcolor: 'rgba(255, 255, 255, 0.1)',
                            borderRadius: 2,
                            p: 2
                        }}
                    >
                        <Stack spacing={1.5}>
                            {call.type === 'video' && (
                                <Stack
                                    direction="row"
                                    alignItems="center"
                                    justifyContent="space-between"
                                >
                                    <Stack direction="row" alignItems="center" spacing={1}>
                                        {videoEnabled ? (
                                            <VideocamIcon sx={{ color: 'white', fontSize: 20 }} />
                                        ) : (
                                            <VideocamOffIcon
                                                sx={{
                                                    color: 'rgba(255, 255, 255, 0.6)',
                                                    fontSize: 20
                                                }}
                                            />
                                        )}
                                        <Typography variant="body2" color="white">
                                            Video
                                        </Typography>
                                    </Stack>
                                    <Switch
                                        checked={videoEnabled}
                                        onChange={e => setVideoEnabled(e.target.checked)}
                                        sx={{
                                            '& .MuiSwitch-switchBase.Mui-checked': {
                                                color: 'white'
                                            },
                                            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track':
                                                {
                                                    bgcolor: 'rgba(255, 255, 255, 0.5)'
                                                }
                                        }}
                                    />
                                </Stack>
                            )}
                            <Stack
                                direction="row"
                                alignItems="center"
                                justifyContent="space-between"
                            >
                                <Stack direction="row" alignItems="center" spacing={1}>
                                    {audioEnabled ? (
                                        <MicIcon sx={{ color: 'white', fontSize: 20 }} />
                                    ) : (
                                        <MicOffIcon
                                            sx={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: 20 }}
                                        />
                                    )}
                                    <Typography variant="body2" color="white">
                                        Microphone
                                    </Typography>
                                </Stack>
                                <Switch
                                    checked={audioEnabled}
                                    onChange={e => setAudioEnabled(e.target.checked)}
                                    sx={{
                                        '& .MuiSwitch-switchBase.Mui-checked': {
                                            color: 'white'
                                        },
                                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                            bgcolor: 'rgba(255, 255, 255, 0.5)'
                                        }
                                    }}
                                />
                            </Stack>
                        </Stack>
                    </Box>

                    {/* Action Buttons */}
                    <Stack direction="row" spacing={2} sx={{ width: '100%', mt: 2 }}>
                        <IconButton
                            onClick={handleDecline}
                            sx={{
                                flex: 1,
                                bgcolor: theme.palette.error.main,
                                color: 'white',
                                '&:hover': {
                                    bgcolor: theme.palette.error.dark
                                },
                                height: 64,
                                borderRadius: 2
                            }}
                        >
                            <PhoneDisabledIcon sx={{ fontSize: 32 }} />
                        </IconButton>
                        <IconButton
                            onClick={handleAccept}
                            sx={{
                                flex: 1,
                                bgcolor: theme.palette.success.main,
                                color: 'white',
                                '&:hover': {
                                    bgcolor: theme.palette.success.dark
                                },
                                height: 64,
                                borderRadius: 2
                            }}
                        >
                            <PhoneIcon sx={{ fontSize: 32 }} />
                        </IconButton>
                    </Stack>
                </Stack>
            </DialogContent>
        </Dialog>
    );
};
