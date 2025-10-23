import React from 'react';
import {
    Box,
    Button,
    Chip,
    Divider,
    List,
    ListItemButton,
    ListItemText,
    Skeleton,
    Stack,
    Tooltip,
    Typography
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import FolderIcon from '@mui/icons-material/FolderOutlined';
import type { Project } from '../types/project';
import { PROJECT_STATUS_METADATA, PROJECT_PRIORITY_METADATA } from '../types/project';

interface ProjectListProps {
    readonly projects: Project[];
    readonly selectedProjectId: string | null;
    readonly onSelect: (projectId: string) => void;
    readonly onCreate: () => void;
    readonly isLoading?: boolean;
}

const renderSkeletonItems = (): React.ReactElement => (
    <Stack spacing={1.5} sx={{ p: 2 }}>
        {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} height={56} variant="rounded" />
        ))}
    </Stack>
);

export const ProjectList: React.FC<ProjectListProps> = ({
    projects,
    selectedProjectId,
    onSelect,
    onCreate,
    isLoading
}) => {
    const sortedProjects = React.useMemo(
        () => [...projects].sort((a, b) => a.name.localeCompare(b.name)),
        [projects]
    );

    return (
        <Box
            sx={{
                width: 320,
                borderRight: theme => `1px solid ${theme.palette.divider}`,
                display: 'flex',
                flexDirection: 'column',
                height: '100%'
            }}
        >
            <Box sx={{ p: 2 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                    <FolderIcon fontSize="small" />
                    <Typography variant="subtitle1" fontWeight={600}>
                        Projects
                    </Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Choose a project to manage its work.
                </Typography>
                <Button
                    startIcon={<AddIcon fontSize="small" />}
                    variant="contained"
                    size="small"
                    sx={{ mt: 2 }}
                    onClick={onCreate}
                >
                    New project
                </Button>
            </Box>
            <Divider />
            {isLoading ? (
                renderSkeletonItems()
            ) : sortedProjects.length === 0 ? (
                <Box sx={{ px: 2, py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                        No projects yet. Create one to get started.
                    </Typography>
                </Box>
            ) : (
                <List disablePadding sx={{ flex: 1, overflowY: 'auto' }}>
                    {sortedProjects.map(project => {
                        const statusMeta = PROJECT_STATUS_METADATA[project.status];
                        const priorityMeta = PROJECT_PRIORITY_METADATA[project.priority];
                        return (
                            <ListItemButton
                                key={project.id}
                                selected={project.id === selectedProjectId}
                                onClick={() => onSelect(project.id)}
                                sx={{ alignItems: 'flex-start', py: 1.5, px: 2 }}
                            >
                                <ListItemText
                                    primary={
                                        <Stack spacing={0.75}>
                                            <Typography variant="subtitle2" fontWeight={600}>
                                                {project.name}
                                            </Typography>
                                            <Stack direction="row" spacing={1} alignItems="center">
                                                <Chip
                                                    size="small"
                                                    label={statusMeta.label}
                                                    sx={{
                                                        bgcolor: statusMeta.color,
                                                        color: 'common.white'
                                                    }}
                                                />
                                                <Tooltip title={`Priority: ${priorityMeta.label}`}>
                                                    <Chip
                                                        size="small"
                                                        label={priorityMeta.label}
                                                        sx={{
                                                            bgcolor: priorityMeta.color,
                                                            color: 'common.white'
                                                        }}
                                                    />
                                                </Tooltip>
                                                <Typography
                                                    variant="caption"
                                                    color="text.secondary"
                                                >
                                                    {project.taskCount} tasks
                                                </Typography>
                                            </Stack>
                                        </Stack>
                                    }
                                    secondary={
                                        project.description ? (
                                            <Typography
                                                variant="body2"
                                                color="text.secondary"
                                                sx={{
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: 'vertical',
                                                    overflow: 'hidden'
                                                }}
                                            >
                                                {project.description}
                                            </Typography>
                                        ) : null
                                    }
                                />
                            </ListItemButton>
                        );
                    })}
                </List>
            )}
        </Box>
    );
};
