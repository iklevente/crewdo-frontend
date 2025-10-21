import React from 'react';
import { Avatar, Box, IconButton, Skeleton, Stack, Tooltip, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import type { Workspace } from '../types/workspace';

interface WorkspaceSwitcherProps {
    readonly workspaces: Workspace[];
    readonly selectedWorkspaceId: string | null;
    readonly onSelect: (workspace: Workspace) => void;
    readonly onCreateWorkspace: () => void;
    readonly canCreateWorkspace: boolean;
    readonly isLoading?: boolean;
}

const getWorkspaceLabel = (workspace: Workspace): string => {
    const initials = `${workspace.name?.[0] ?? ''}`.trim().toUpperCase();
    return initials || '#';
};

export const WorkspaceSwitcher: React.FC<WorkspaceSwitcherProps> = ({
    workspaces,
    selectedWorkspaceId,
    onSelect,
    onCreateWorkspace,
    canCreateWorkspace,
    isLoading
}) => {
    return (
        <Box
            sx={{
                width: { xs: 72, sm: 88 },
                borderRight: theme => `1px solid ${theme.palette.divider}`,
                height: '100%',
                position: 'sticky',
                top: 0,
                backgroundColor: theme => theme.palette.background.default,
                zIndex: theme => theme.zIndex.appBar - 1,
                py: 2
            }}
        >
            <Stack spacing={2} alignItems="center">
                {canCreateWorkspace ? (
                    <Tooltip title="Create workspace" placement="right">
                        <IconButton
                            color="primary"
                            onClick={onCreateWorkspace}
                            size="medium"
                            sx={{
                                borderRadius: '50%',
                                backgroundColor: theme => theme.palette.primary.light,
                                color: theme => theme.palette.primary.contrastText,
                                '&:hover': {
                                    backgroundColor: theme => theme.palette.primary.main
                                }
                            }}
                        >
                            <AddIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                ) : null}

                <Stack spacing={1.5} alignItems="center" sx={{ width: '100%' }}>
                    {isLoading ? (
                        Array.from({ length: 4 }).map((_, index) => (
                            <Skeleton key={index} variant="circular" width={48} height={48} />
                        ))
                    ) : workspaces.length > 0 ? (
                        workspaces.map(workspace => {
                            const isActive = workspace.id === selectedWorkspaceId;
                            return (
                                <Tooltip
                                    key={workspace.id}
                                    title={workspace.name}
                                    placement="right"
                                >
                                    <Avatar
                                        onClick={() => onSelect(workspace)}
                                        sx={theme => ({
                                            width: 48,
                                            height: 48,
                                            cursor: 'pointer',
                                            borderRadius: 2,
                                            backgroundColor: isActive
                                                ? theme.palette.primary.main
                                                : theme.palette.grey[900],
                                            color: theme.palette.common.white,
                                            border: isActive
                                                ? `2px solid ${theme.palette.primary.dark}`
                                                : `1px solid ${theme.palette.divider}`,
                                            transition: theme.transitions.create(
                                                ['transform', 'border-color'],
                                                {
                                                    duration: theme.transitions.duration.shorter
                                                }
                                            ),
                                            '&:hover': {
                                                transform: 'translateY(-4px)'
                                            }
                                        })}
                                        variant="rounded"
                                    >
                                        {getWorkspaceLabel(workspace)}
                                    </Avatar>
                                </Tooltip>
                            );
                        })
                    ) : (
                        <Box sx={{ px: 1.5, textAlign: 'center' }}>
                            <Typography variant="caption" color="text.secondary">
                                No workspaces yet
                            </Typography>
                        </Box>
                    )}
                </Stack>
            </Stack>
        </Box>
    );
};
