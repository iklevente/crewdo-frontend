import React from 'react';
import {
    Alert,
    Avatar,
    AvatarGroup,
    Box,
    Button,
    Card,
    CardContent,
    CardActions,
    Chip,
    Divider,
    List,
    ListItemAvatar,
    ListItemButton,
    ListItemText,
    Paper,
    Skeleton,
    Stack,
    Typography
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import WorkspacesIcon from '@mui/icons-material/CottageOutlined';
import ViewKanbanIcon from '@mui/icons-material/ViewKanban';
import CallIcon from '@mui/icons-material/Call';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AddIcon from '@mui/icons-material/Add';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { apiClients } from 'services/api-clients';
import { useAuthStore } from 'store/auth-store';
import { useAppNavigate } from 'appHistory';
import { useWorkspaces } from 'features/workspaces/hooks/useWorkspaces';
import { useProjects } from 'features/projects/hooks/useProjects';
import { useCalls } from 'features/calls/hooks/useCalls';
import { useDirectMessageChannels } from 'features/channels/hooks/useDirectMessageChannels';
import { useUnreadCount } from 'features/notifications/hooks/useUnreadCount';

const getDisplayName = (firstName?: string, lastName?: string): string => {
    const name = `${firstName ?? ''} ${lastName ?? ''}`.trim();
    return name.length > 0 ? name : 'Unknown';
};

const formatDateTime = (value?: string | null): string => {
    if (!value) {
        return '';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return '';
    }
    return format(date, 'MMM d, HH:mm');
};

export const OverviewPage: React.FC = () => {
    const theme = useTheme();
    const navigate = useAppNavigate();
    const user = useAuthStore(state => state.user);
    const refreshToken = useAuthStore(state => state.refreshToken);
    const setTokens = useAuthStore(state => state.setTokens);
    const clearAuth = useAuthStore(state => state.clearAuth);
    const isHydrated = useAuthStore(state => state.isHydrated);

    const { workspaces, isLoading: workspacesLoading } = useWorkspaces();
    const { projects, isLoading: projectsLoading } = useProjects(null);
    const { activeCalls, scheduledCalls, isLoading: callsLoading } = useCalls();
    const { channels: dmChannels, isLoading: dmLoading } = useDirectMessageChannels();
    const { unreadCount } = useUnreadCount();

    React.useEffect(() => {
        let cancelled = false;

        const refreshAccessToken = async (): Promise<void> => {
            if (!isHydrated || !refreshToken) {
                return;
            }

            try {
                const response = await apiClients.auth.authControllerRefresh({
                    refresh_token: refreshToken
                });
                const payload = response.data as unknown as { access_token?: string };
                if (!payload?.access_token) {
                    throw new Error('No access token returned');
                }
                if (!cancelled) {
                    setTokens(payload.access_token, refreshToken);
                }
            } catch (error) {
                if (cancelled) {
                    return;
                }
                console.error('Failed to refresh access token on overview load:', error);
                clearAuth();
                toast.error('Your session expired. Please sign in again.');
            }
        };

        void refreshAccessToken();

        return () => {
            cancelled = true;
        };
    }, [clearAuth, isHydrated, refreshToken, setTokens]);

    const recentProjects = React.useMemo(() => {
        return projects
            .sort((a, b) => {
                const aDate = new Date(a.updatedAt ?? a.createdAt);
                const bDate = new Date(b.updatedAt ?? b.createdAt);
                return bDate.getTime() - aDate.getTime();
            })
            .slice(0, 5);
    }, [projects]);

    const recentDMs = React.useMemo(() => {
        return dmChannels
            .sort((a, b) => {
                const aDate = new Date(a.lastMessage?.createdAt ?? a.createdAt);
                const bDate = new Date(b.lastMessage?.createdAt ?? b.createdAt);
                return bDate.getTime() - aDate.getTime();
            })
            .slice(0, 5);
    }, [dmChannels]);

    const upcomingCalls = React.useMemo(() => {
        return [...activeCalls, ...scheduledCalls]
            .sort((a, b) => {
                const aDate = new Date(a.scheduledStartTime ?? a.createdAt);
                const bDate = new Date(b.scheduledStartTime ?? b.createdAt);
                return aDate.getTime() - bDate.getTime();
            })
            .slice(0, 3);
    }, [activeCalls, scheduledCalls]);

    return (
        <Box sx={{ px: { xs: 2, md: 4 }, py: 3 }}>
            <Stack spacing={3}>
                {/* Header */}
                <Box>
                    <Typography variant="h4" fontWeight={600} gutterBottom>
                        Welcome back, {user?.firstName ?? 'there'}
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Here&apos;s what&apos;s happening across your workspaces and projects
                    </Typography>
                </Box>

                {/* Stats Cards */}
                <Box
                    sx={{
                        display: 'grid',
                        gap: 2,
                        gridTemplateColumns: {
                            xs: '1fr',
                            sm: 'repeat(2, 1fr)',
                            md: 'repeat(4, 1fr)'
                        }
                    }}
                >
                    <Card variant="outlined">
                        <CardContent>
                            <Stack direction="row" alignItems="center" spacing={2}>
                                <Box
                                    sx={{
                                        width: 48,
                                        height: 48,
                                        borderRadius: 2,
                                        display: 'grid',
                                        placeItems: 'center',
                                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                                        color: 'primary.main'
                                    }}
                                >
                                    <WorkspacesIcon />
                                </Box>
                                <Box>
                                    <Typography variant="h4" fontWeight={600}>
                                        {workspacesLoading ? (
                                            <Skeleton width={40} />
                                        ) : (
                                            workspaces.length
                                        )}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Workspaces
                                    </Typography>
                                </Box>
                            </Stack>
                        </CardContent>
                    </Card>

                    <Card variant="outlined">
                        <CardContent>
                            <Stack direction="row" alignItems="center" spacing={2}>
                                <Box
                                    sx={{
                                        width: 48,
                                        height: 48,
                                        borderRadius: 2,
                                        display: 'grid',
                                        placeItems: 'center',
                                        bgcolor: alpha(theme.palette.success.main, 0.1),
                                        color: 'success.main'
                                    }}
                                >
                                    <ViewKanbanIcon />
                                </Box>
                                <Box>
                                    <Typography variant="h4" fontWeight={600}>
                                        {projectsLoading ? (
                                            <Skeleton width={40} />
                                        ) : (
                                            projects.length
                                        )}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Projects
                                    </Typography>
                                </Box>
                            </Stack>
                        </CardContent>
                    </Card>

                    <Card variant="outlined">
                        <CardContent>
                            <Stack direction="row" alignItems="center" spacing={2}>
                                <Box
                                    sx={{
                                        width: 48,
                                        height: 48,
                                        borderRadius: 2,
                                        display: 'grid',
                                        placeItems: 'center',
                                        bgcolor: alpha(theme.palette.info.main, 0.1),
                                        color: 'info.main'
                                    }}
                                >
                                    <CallIcon />
                                </Box>
                                <Box>
                                    <Typography variant="h4" fontWeight={600}>
                                        {callsLoading ? (
                                            <Skeleton width={40} />
                                        ) : (
                                            activeCalls.length
                                        )}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Active Calls
                                    </Typography>
                                </Box>
                            </Stack>
                        </CardContent>
                    </Card>

                    <Card variant="outlined">
                        <CardContent>
                            <Stack direction="row" alignItems="center" spacing={2}>
                                <Box
                                    sx={{
                                        width: 48,
                                        height: 48,
                                        borderRadius: 2,
                                        display: 'grid',
                                        placeItems: 'center',
                                        bgcolor: alpha(theme.palette.warning.main, 0.1),
                                        color: 'warning.main'
                                    }}
                                >
                                    <TrendingUpIcon />
                                </Box>
                                <Box>
                                    <Typography variant="h4" fontWeight={600}>
                                        {unreadCount}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Notifications
                                    </Typography>
                                </Box>
                            </Stack>
                        </CardContent>
                    </Card>
                </Box>

                {/* Main Content Grid */}
                <Box
                    sx={{
                        display: 'grid',
                        gap: 3,
                        gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' }
                    }}
                >
                    {/* Workspaces */}
                    <Card variant="outlined">
                        <CardContent>
                            <Stack
                                direction="row"
                                alignItems="center"
                                justifyContent="space-between"
                                mb={2}
                            >
                                <Typography variant="h6" fontWeight={600}>
                                    Your Workspaces
                                </Typography>
                                <Button
                                    size="small"
                                    startIcon={<AddIcon />}
                                    onClick={() => navigate('/app/workspaces')}
                                >
                                    New
                                </Button>
                            </Stack>
                            {workspacesLoading ? (
                                <Stack spacing={1}>
                                    {[1, 2, 3].map(i => (
                                        <Skeleton key={i} height={60} />
                                    ))}
                                </Stack>
                            ) : workspaces.length === 0 ? (
                                <Alert severity="info">
                                    No workspaces yet. Create one to get started!
                                </Alert>
                            ) : (
                                <List disablePadding>
                                    {workspaces.slice(0, 5).map((workspace, index) => (
                                        <React.Fragment key={workspace.id}>
                                            {index > 0 ? <Divider /> : null}
                                            <ListItemButton
                                                onClick={() => navigate(`/app/workspaces`)}
                                            >
                                                <ListItemAvatar>
                                                    <Avatar
                                                        sx={{
                                                            bgcolor: 'primary.main'
                                                        }}
                                                    >
                                                        {workspace.name.charAt(0).toUpperCase()}
                                                    </Avatar>
                                                </ListItemAvatar>
                                                <ListItemText
                                                    primary={workspace.name}
                                                    secondary={`${workspace.members?.length ?? 0} members`}
                                                />
                                            </ListItemButton>
                                        </React.Fragment>
                                    ))}
                                </List>
                            )}
                        </CardContent>
                    </Card>

                    {/* Recent Projects */}
                    <Card variant="outlined">
                        <CardContent>
                            <Stack
                                direction="row"
                                alignItems="center"
                                justifyContent="space-between"
                                mb={2}
                            >
                                <Typography variant="h6" fontWeight={600}>
                                    Recent Projects
                                </Typography>
                                <Button
                                    size="small"
                                    startIcon={<AddIcon />}
                                    onClick={() => navigate('/app/projects')}
                                >
                                    New
                                </Button>
                            </Stack>
                            {projectsLoading ? (
                                <Stack spacing={1}>
                                    {[1, 2, 3].map(i => (
                                        <Skeleton key={i} height={60} />
                                    ))}
                                </Stack>
                            ) : recentProjects.length === 0 ? (
                                <Alert severity="info">
                                    No projects yet. Start organizing your work!
                                </Alert>
                            ) : (
                                <List disablePadding>
                                    {recentProjects.map((project, index) => (
                                        <React.Fragment key={project.id}>
                                            {index > 0 ? <Divider /> : null}
                                            <ListItemButton
                                                onClick={() => navigate('/app/projects')}
                                            >
                                                <ListItemText
                                                    primary={project.name}
                                                    secondary={
                                                        <Stack
                                                            direction="row"
                                                            spacing={1}
                                                            alignItems="center"
                                                        >
                                                            <Chip
                                                                label={project.status}
                                                                size="small"
                                                                sx={{ textTransform: 'capitalize' }}
                                                            />
                                                            {project.members &&
                                                            project.members.length > 0 ? (
                                                                <AvatarGroup max={3} sx={{ ml: 1 }}>
                                                                    {project.members.map(member => (
                                                                        <Avatar
                                                                            key={member.id}
                                                                            sx={{
                                                                                width: 24,
                                                                                height: 24,
                                                                                fontSize: '0.75rem'
                                                                            }}
                                                                        >
                                                                            {member.firstName
                                                                                ?.charAt(0)
                                                                                .toUpperCase()}
                                                                        </Avatar>
                                                                    ))}
                                                                </AvatarGroup>
                                                            ) : null}
                                                        </Stack>
                                                    }
                                                    secondaryTypographyProps={{ component: 'div' }}
                                                />
                                            </ListItemButton>
                                        </React.Fragment>
                                    ))}
                                </List>
                            )}
                        </CardContent>
                    </Card>

                    {/* Upcoming Calls */}
                    <Card variant="outlined">
                        <CardContent>
                            <Stack
                                direction="row"
                                alignItems="center"
                                justifyContent="space-between"
                                mb={2}
                            >
                                <Typography variant="h6" fontWeight={600}>
                                    Upcoming Calls
                                </Typography>
                                <Button
                                    size="small"
                                    startIcon={<AddIcon />}
                                    onClick={() => navigate('/app/calls')}
                                >
                                    New
                                </Button>
                            </Stack>
                            {callsLoading ? (
                                <Stack spacing={1}>
                                    {[1, 2].map(i => (
                                        <Skeleton key={i} height={80} />
                                    ))}
                                </Stack>
                            ) : upcomingCalls.length === 0 ? (
                                <Alert severity="info">No upcoming calls scheduled</Alert>
                            ) : (
                                <Stack spacing={2}>
                                    {upcomingCalls.map(call => (
                                        <Paper
                                            key={call.id}
                                            variant="outlined"
                                            sx={{
                                                p: 2,
                                                cursor: 'pointer',
                                                '&:hover': {
                                                    bgcolor: 'action.hover'
                                                }
                                            }}
                                            onClick={() => navigate('/app/calls')}
                                        >
                                            <Stack spacing={1}>
                                                <Stack
                                                    direction="row"
                                                    alignItems="center"
                                                    spacing={1}
                                                >
                                                    <CallIcon fontSize="small" color="primary" />
                                                    <Typography
                                                        variant="subtitle2"
                                                        fontWeight={600}
                                                    >
                                                        {call.title ?? 'Untitled Call'}
                                                    </Typography>
                                                    <Chip
                                                        label={call.status}
                                                        size="small"
                                                        color={
                                                            call.status === 'active'
                                                                ? 'success'
                                                                : 'default'
                                                        }
                                                    />
                                                </Stack>
                                                <Stack
                                                    direction="row"
                                                    alignItems="center"
                                                    spacing={2}
                                                >
                                                    <Typography
                                                        variant="caption"
                                                        color="text.secondary"
                                                    >
                                                        {formatDateTime(call.scheduledStartTime)}
                                                    </Typography>
                                                    <AvatarGroup max={4} sx={{ ml: 'auto' }}>
                                                        {call.participants.map(p => (
                                                            <Avatar
                                                                key={p.id}
                                                                sx={{
                                                                    width: 24,
                                                                    height: 24,
                                                                    fontSize: '0.75rem'
                                                                }}
                                                            >
                                                                {p.user.firstName
                                                                    ?.charAt(0)
                                                                    .toUpperCase()}
                                                            </Avatar>
                                                        ))}
                                                    </AvatarGroup>
                                                </Stack>
                                            </Stack>
                                        </Paper>
                                    ))}
                                </Stack>
                            )}
                        </CardContent>
                    </Card>

                    {/* Recent Conversations */}
                    <Card variant="outlined">
                        <CardContent>
                            <Stack
                                direction="row"
                                alignItems="center"
                                justifyContent="space-between"
                                mb={2}
                            >
                                <Typography variant="h6" fontWeight={600}>
                                    Recent Conversations
                                </Typography>
                                <Button
                                    size="small"
                                    startIcon={<ChatBubbleOutlineIcon />}
                                    onClick={() => navigate('/app/conversations')}
                                >
                                    View All
                                </Button>
                            </Stack>
                            {dmLoading ? (
                                <Stack spacing={1}>
                                    {[1, 2, 3].map(i => (
                                        <Skeleton key={i} height={60} />
                                    ))}
                                </Stack>
                            ) : recentDMs.length === 0 ? (
                                <Alert severity="info">
                                    No conversations yet. Start chatting with your team!
                                </Alert>
                            ) : (
                                <List disablePadding>
                                    {recentDMs.map((channel, index) => {
                                        const otherMember = channel.members?.find(
                                            m => m.id !== user?.id
                                        );
                                        const displayName = otherMember
                                            ? getDisplayName(
                                                  otherMember.firstName,
                                                  otherMember.lastName
                                              )
                                            : 'Unknown';

                                        return (
                                            <React.Fragment key={channel.id}>
                                                {index > 0 ? <Divider /> : null}
                                                <ListItemButton
                                                    onClick={() =>
                                                        navigate(`/app/conversations/${channel.id}`)
                                                    }
                                                >
                                                    <ListItemAvatar>
                                                        <Avatar>
                                                            {displayName.charAt(0).toUpperCase()}
                                                        </Avatar>
                                                    </ListItemAvatar>
                                                    <ListItemText
                                                        primary={displayName}
                                                        secondary={formatDateTime(
                                                            channel.lastMessage?.createdAt
                                                        )}
                                                    />
                                                </ListItemButton>
                                            </React.Fragment>
                                        );
                                    })}
                                </List>
                            )}
                        </CardContent>
                    </Card>
                </Box>

                {/* Quick Actions */}
                <Card variant="outlined">
                    <CardContent>
                        <Typography variant="h6" fontWeight={600} gutterBottom>
                            Quick Actions
                        </Typography>
                        <Box
                            sx={{
                                display: 'grid',
                                gap: 2,
                                gridTemplateColumns: {
                                    xs: '1fr',
                                    sm: 'repeat(2, 1fr)',
                                    md: 'repeat(4, 1fr)'
                                },
                                mt: 2
                            }}
                        >
                            <Button
                                variant="outlined"
                                size="large"
                                startIcon={<WorkspacesIcon />}
                                onClick={() => navigate('/app/workspaces')}
                                sx={{ justifyContent: 'flex-start' }}
                            >
                                Create Workspace
                            </Button>
                            <Button
                                variant="outlined"
                                size="large"
                                startIcon={<ViewKanbanIcon />}
                                onClick={() => navigate('/app/projects')}
                                sx={{ justifyContent: 'flex-start' }}
                            >
                                New Project
                            </Button>
                            <Button
                                variant="outlined"
                                size="large"
                                startIcon={<CallIcon />}
                                onClick={() => navigate('/app/calls')}
                                sx={{ justifyContent: 'flex-start' }}
                            >
                                Start Call
                            </Button>
                            <Button
                                variant="outlined"
                                size="large"
                                startIcon={<ChatBubbleOutlineIcon />}
                                onClick={() => navigate('/app/conversations')}
                                sx={{ justifyContent: 'flex-start' }}
                            >
                                New Message
                            </Button>
                        </Box>
                    </CardContent>
                </Card>
            </Stack>
        </Box>
    );
};
