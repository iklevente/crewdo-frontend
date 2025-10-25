import React from 'react';
import {
    Box,
    Button,
    Divider,
    FormControl,
    IconButton,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    Tooltip,
    Typography
} from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare';
import CallEndIcon from '@mui/icons-material/CallEnd';

interface ActiveCallControlsProps {
    readonly onLeave: () => void;
    readonly onToggleMute: (next: boolean) => Promise<void>;
    readonly onToggleVideo: (next: boolean) => Promise<void>;
    readonly onToggleScreenShare: (next: boolean) => Promise<void>;
    readonly muted: boolean;
    readonly videoEnabled: boolean;
    readonly screenShareEnabled: boolean;
    readonly canShareScreen: boolean;
    readonly screenShareLocked?: boolean;
    readonly audioInputDevices: MediaDeviceInfo[];
    readonly audioOutputDevices: MediaDeviceInfo[];
    readonly videoDevices: MediaDeviceInfo[];
    readonly selectedAudioInputId: string | null;
    readonly selectedAudioOutputId: string | null;
    readonly selectedVideoDeviceId: string | null;
    readonly onSelectAudioInput: (deviceId: string) => void;
    readonly onSelectAudioOutput: (deviceId: string) => void;
    readonly onSelectVideoDevice: (deviceId: string) => void;
}

const renderDeviceOptions = (devices: MediaDeviceInfo[]): React.ReactNode =>
    devices.map(device => (
        <MenuItem key={device.deviceId} value={device.deviceId}>
            {device.label || 'Unknown device'}
        </MenuItem>
    ));

export const ActiveCallControls: React.FC<ActiveCallControlsProps> = ({
    onLeave,
    onToggleMute,
    onToggleVideo,
    onToggleScreenShare,
    muted,
    videoEnabled,
    screenShareEnabled,
    canShareScreen,
    screenShareLocked = false,
    audioInputDevices,
    audioOutputDevices,
    videoDevices,
    selectedAudioInputId,
    selectedAudioOutputId,
    selectedVideoDeviceId,
    onSelectAudioInput,
    onSelectAudioOutput,
    onSelectVideoDevice
}) => {
    const screenShareTooltip = screenShareEnabled
        ? 'Stop sharing screen'
        : screenShareLocked
          ? 'Screen share is already in progress'
          : 'Share your screen';

    return (
        <Box
            sx={{
                p: { xs: 2, md: 3 },
                borderTop: theme => `1px solid ${theme.palette.divider}`,
                bgcolor: theme => theme.palette.background.paper,
                backdropFilter: 'blur(12px)'
            }}
        >
            <Stack direction={{ xs: 'column', lg: 'row' }} spacing={3} alignItems="center">
                <Stack direction="row" spacing={1.5} alignItems="center">
                    <Tooltip title={muted ? 'Unmute microphone' : 'Mute microphone'}>
                        <span>
                            <IconButton
                                color={muted ? 'error' : 'primary'}
                                onClick={() => {
                                    void onToggleMute(!muted);
                                }}
                                size="large"
                            >
                                {muted ? <MicOffIcon /> : <MicIcon />}
                            </IconButton>
                        </span>
                    </Tooltip>
                    <Tooltip title={videoEnabled ? 'Turn off camera' : 'Turn on camera'}>
                        <span>
                            <IconButton
                                color={videoEnabled ? 'primary' : 'default'}
                                onClick={() => {
                                    void onToggleVideo(!videoEnabled);
                                }}
                                size="large"
                            >
                                {videoEnabled ? <VideocamIcon /> : <VideocamOffIcon />}
                            </IconButton>
                        </span>
                    </Tooltip>
                    <Tooltip title={screenShareTooltip}>
                        <span>
                            <IconButton
                                color={screenShareEnabled ? 'success' : 'default'}
                                onClick={() => {
                                    void onToggleScreenShare(!screenShareEnabled);
                                }}
                                size="large"
                                disabled={
                                    !canShareScreen || (screenShareLocked && !screenShareEnabled)
                                }
                            >
                                {screenShareEnabled ? <StopScreenShareIcon /> : <ScreenShareIcon />}
                            </IconButton>
                        </span>
                    </Tooltip>
                </Stack>

                <Divider
                    flexItem
                    orientation="vertical"
                    sx={{ display: { xs: 'none', lg: 'block' } }}
                />

                <Stack
                    direction={{ xs: 'column', md: 'row' }}
                    spacing={2}
                    flexWrap="wrap"
                    alignItems="center"
                    justifyContent="center"
                >
                    <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel id="audio-input-select">Audio input</InputLabel>
                        <Select
                            labelId="audio-input-select"
                            label="Audio input"
                            value={selectedAudioInputId ?? ''}
                            onChange={event => onSelectAudioInput(event.target.value)}
                        >
                            {audioInputDevices.length > 0 ? (
                                renderDeviceOptions(audioInputDevices)
                            ) : (
                                <MenuItem value="">
                                    <Typography variant="body2">No microphone found</Typography>
                                </MenuItem>
                            )}
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel id="audio-output-select">Audio output</InputLabel>
                        <Select
                            labelId="audio-output-select"
                            label="Audio output"
                            value={selectedAudioOutputId ?? ''}
                            onChange={event => onSelectAudioOutput(event.target.value)}
                        >
                            {audioOutputDevices.length > 0 ? (
                                renderDeviceOptions(audioOutputDevices)
                            ) : (
                                <MenuItem value="">
                                    <Typography variant="body2">Default output</Typography>
                                </MenuItem>
                            )}
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel id="video-input-select">Camera</InputLabel>
                        <Select
                            labelId="video-input-select"
                            label="Camera"
                            value={selectedVideoDeviceId ?? ''}
                            onChange={event => onSelectVideoDevice(event.target.value)}
                        >
                            {videoDevices.length > 0 ? (
                                renderDeviceOptions(videoDevices)
                            ) : (
                                <MenuItem value="">
                                    <Typography variant="body2">No camera found</Typography>
                                </MenuItem>
                            )}
                        </Select>
                    </FormControl>
                </Stack>

                <Divider
                    flexItem
                    orientation="vertical"
                    sx={{ display: { xs: 'none', lg: 'block' } }}
                />

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="center">
                    {screenShareLocked && !screenShareEnabled ? (
                        <Typography variant="caption" color="text.secondary">
                            Someone else is sharing their screen
                        </Typography>
                    ) : null}
                    <Button
                        variant="contained"
                        color="error"
                        onClick={onLeave}
                        startIcon={<CallEndIcon />}
                        size="large"
                    >
                        Leave call
                    </Button>
                </Stack>
            </Stack>
        </Box>
    );
};
