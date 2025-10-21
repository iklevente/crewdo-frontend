import React from 'react';
import { Outlet } from 'react-router-dom';
import {
    AppBar,
    Avatar,
    Box,
    Button,
    Divider,
    Drawer,
    IconButton,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Stack,
    Toolbar,
    Typography
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import WorkspacesIcon from '@mui/icons-material/CottageOutlined';
import ViewKanbanIcon from '@mui/icons-material/ViewKanban';
import NotificationsIcon from '@mui/icons-material/NotificationsNone';
import CallIcon from '@mui/icons-material/Call';
import GroupIcon from '@mui/icons-material/GroupOutlined';
import SettingsIcon from '@mui/icons-material/SettingsOutlined';
import LogoutIcon from '@mui/icons-material/LogoutOutlined';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAuthStore } from 'store/auth-store';
import { useAppLocation, useAppNavigate } from 'appHistory';
import { PresenceStatusControl } from 'components/PresenceStatusControl';

const drawerWidth = 280;

interface NavigationItem {
    readonly label: string;
    readonly icon: React.ReactElement;
    readonly path: string;
}

const navigationItems: NavigationItem[] = [
    {
        label: 'Overview',
        icon: <ChatBubbleOutlineIcon fontSize="small" />,
        path: '/app'
    },
    {
        label: 'Workspaces',
        icon: <WorkspacesIcon fontSize="small" />,
        path: '/app/workspaces'
    },
    {
        label: 'Projects',
        icon: <ViewKanbanIcon fontSize="small" />,
        path: '/app/projects'
    },
    {
        label: 'Calls',
        icon: <CallIcon fontSize="small" />,
        path: '/app/calls'
    },
    {
        label: 'Notifications',
        icon: <NotificationsIcon fontSize="small" />,
        path: '/app/notifications'
    },
    {
        label: 'Users',
        icon: <GroupIcon fontSize="small" />,
        path: '/app/users'
    },
    {
        label: 'Settings',
        icon: <SettingsIcon fontSize="small" />,
        path: '/app/settings'
    }
];

export const MainLayout: React.FC = () => {
    const navigate = useAppNavigate();
    const location = useAppLocation();
    const [mobileOpen, setMobileOpen] = React.useState(false);
    const user = useAuthStore(state => state.user);
    const clearAuth = useAuthStore(state => state.clearAuth);
    const queryClient = useQueryClient();

    const handleDrawerToggle = (): void => {
        setMobileOpen(prev => !prev);
    };

    const handleNavigate = (path: string): void => {
        navigate(path);
        setMobileOpen(false);
    };

    const handleLogout = React.useCallback((): void => {
        clearAuth();
        queryClient.clear();
        navigate('/login');
        toast.success('Signed out');
    }, [clearAuth, navigate, queryClient]);

    const drawer = (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Toolbar>
                <Typography variant="h6" noWrap component="div">
                    Crewdo
                </Typography>
            </Toolbar>
            <Divider />
            <List sx={{ flex: 1 }}>
                {navigationItems.map(item => (
                    <ListItemButton
                        key={item.path}
                        onClick={() => handleNavigate(item.path)}
                        selected={
                            location.pathname === item.path ||
                            location.pathname.startsWith(`${item.path}/`)
                        }
                    >
                        <ListItemIcon>{item.icon}</ListItemIcon>
                        <ListItemText primary={item.label} />
                    </ListItemButton>
                ))}
            </List>
            <Divider />
            <Box
                sx={{
                    p: 2,
                    display: 'flex',
                    alignItems: { xs: 'flex-start', sm: 'center' },
                    gap: 2,
                    flexDirection: { xs: 'column', sm: 'row' }
                }}
            >
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                    {user?.firstName?.[0]?.toUpperCase()}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" fontWeight={600}>
                        {user?.firstName} {user?.lastName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {user?.email}
                    </Typography>
                </Box>
                <Button
                    variant="outlined"
                    size="small"
                    startIcon={<LogoutIcon fontSize="small" />}
                    onClick={handleLogout}
                >
                    Exit
                </Button>
            </Box>
        </Box>
    );

    return (
        <Box sx={{ display: 'flex' }}>
            <AppBar
                position="fixed"
                sx={{
                    width: { sm: `calc(100% - ${drawerWidth}px)` },
                    ml: { sm: `${drawerWidth}px` }
                }}
                color="inherit"
                elevation={1}
            >
                <Toolbar>
                    <IconButton
                        color="inherit"
                        edge="start"
                        onClick={handleDrawerToggle}
                        sx={{ mr: 2, display: { sm: 'none' } }}
                    >
                        <MenuIcon />
                    </IconButton>
                    <Typography variant="h6" noWrap component="div">
                        Collaborate, chat, and ship work
                    </Typography>
                    <Box sx={{ flexGrow: 1 }} />
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                        <PresenceStatusControl />
                    </Stack>
                </Toolbar>
            </AppBar>
            <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
                <Drawer
                    variant="temporary"
                    open={mobileOpen}
                    onClose={handleDrawerToggle}
                    ModalProps={{ keepMounted: true }}
                    sx={{
                        display: { xs: 'block', sm: 'none' },
                        '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth }
                    }}
                >
                    {drawer}
                </Drawer>
                <Drawer
                    variant="permanent"
                    sx={{
                        display: { xs: 'none', sm: 'block' },
                        '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth }
                    }}
                    open
                >
                    {drawer}
                </Drawer>
            </Box>
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    p: 3,
                    width: { sm: `calc(100% - ${drawerWidth}px)` },
                    minHeight: '100vh',
                    bgcolor: 'background.default'
                }}
            >
                <Toolbar />
                <Outlet />
            </Box>
        </Box>
    );
};
