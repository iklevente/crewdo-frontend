import React from 'react';
import {
    Alert,
    Avatar,
    Box,
    Button,
    Chip,
    CircularProgress,
    Divider,
    IconButton,
    MenuItem,
    Stack,
    Tooltip,
    Typography,
    TextField
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/EditOutlined';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import GroupIcon from '@mui/icons-material/GroupOutlined';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import type { CreateProjectDto } from 'api/models/create-project-dto';
import type { UpdateProjectDto } from 'api/models/update-project-dto';
import type { CreateTaskDto } from 'api/models/create-task-dto';
import type { UpdateTaskDto } from 'api/models/update-task-dto';
import { useAuthStore } from 'store/auth-store';
import { useWorkspaceSelectionStore } from 'store/workspace-selection-store';
import { useWorkspaces } from 'features/workspaces/hooks/useWorkspaces';
import { useWorkspaceDetails } from 'features/workspaces/hooks/useWorkspaceDetails';
import { ProjectList } from '../components/ProjectList';
import { TaskCard } from '../components/TaskCard';
import { ProjectFormDialog, type ProjectFormValues } from '../components/ProjectFormDialog';
import { TaskFormDialog, type TaskFormData } from '../components/TaskFormDialog';
import { ProjectMembersDialog } from '../components/ProjectMembersDialog';
import { useProjects } from '../hooks/useProjects';
import { useProjectTasks, PROJECT_TASKS_QUERY_KEY } from '../hooks/useProjectTasks';
import {
    getProjectParticipants,
    PROJECT_PRIORITY_METADATA,
    PROJECT_STATUS_METADATA,
    type Project,
    type ProjectMember
} from '../types/project';
import { TASK_STATUS_METADATA, type TaskStatus, type ProjectTask } from '../types/task';

const POSITION_STEP = 1000;

interface PendingTaskUpdate {
    readonly id: string;
    readonly status: TaskStatus;
    readonly position: number;
    readonly changedStatus: boolean;
}

const buildProjectSummary = (project: Project | null): string => {
    if (!project) {
        return '';
    }
    const statusMeta = PROJECT_STATUS_METADATA[project.status];
    const priorityMeta = PROJECT_PRIORITY_METADATA[project.priority];
    return `${statusMeta.label} • ${priorityMeta.label}`;
};

const statusOrder = Object.keys(TASK_STATUS_METADATA) as TaskStatus[];

const groupTasksByStatus = (tasks: ProjectTask[]): Record<TaskStatus, ProjectTask[]> => {
    const grouped: Record<TaskStatus, ProjectTask[]> = {
        todo: [],
        in_progress: [],
        in_review: [],
        done: [],
        cancelled: []
    };
    tasks.forEach(task => {
        grouped[task.status] = grouped[task.status] ?? [];
        grouped[task.status].push(task);
    });
    statusOrder.forEach(status => {
        grouped[status] = grouped[status].slice().sort((a, b) => {
            if (a.position === b.position) {
                return a.createdAt.localeCompare(b.createdAt);
            }
            return a.position - b.position;
        });
    });
    return grouped;
};

const useProjectPermissions = (
    project: Project | null
): {
    readonly canManageProject: boolean;
    readonly canManageMembers: boolean;
} => {
    const user = useAuthStore(state => state.user);
    const role = (user?.role ?? '').toLowerCase();
    const isAdmin = role === 'admin';
    const isProjectManager = role === 'project_manager';
    const isOwner = project?.owner?.id && user?.id === project.owner.id;

    const canManageProject = Boolean(project && (isAdmin || isProjectManager || isOwner));
    const canManageMembers = canManageProject;

    return { canManageProject, canManageMembers };
};

type CreateProjectPayload = CreateProjectDto & { workspaceId: string };
type UpdateProjectPayload = UpdateProjectDto & { workspaceId?: string };

const mapProjectFormToCreateDto = (values: ProjectFormValues): CreateProjectPayload => {
    const description = values.description?.trim();
    const color = values.color?.trim();
    return {
        name: values.name,
        description: description && description.length > 0 ? description : undefined,
        status: values.status,
        priority: values.priority,
        startDate: values.startDate ?? undefined,
        endDate: values.endDate ?? undefined,
        deadline: values.deadline ?? undefined,
        budget: values.budget ?? undefined,
        color: color && color.length > 0 ? color : undefined,
        workspaceId: values.workspaceId
    };
};

const mapProjectFormToUpdateDto = (values: ProjectFormValues): UpdateProjectPayload => {
    const description = values.description?.trim();
    const color = values.color?.trim();
    return {
        name: values.name,
        description: description && description.length > 0 ? description : undefined,
        status: values.status,
        priority: values.priority,
        startDate: values.startDate ?? undefined,
        endDate: values.endDate ?? undefined,
        deadline: values.deadline ?? undefined,
        budget: values.budget ?? undefined,
        color: color && color.length > 0 ? color : undefined,
        workspaceId: values.workspaceId
    };
};

const mapTaskFormToCreateDto = (projectId: string, values: TaskFormData): CreateTaskDto => ({
    title: values.title,
    description: values.description,
    projectId,
    status: values.status,
    priority: values.priority,
    dueDate: values.dueDate ?? undefined,
    estimatedHours: values.estimatedHours ?? undefined,
    assigneeId: values.assigneeId ?? undefined,
    tags: values.tags && values.tags.length > 0 ? values.tags : undefined
});

const mapTaskFormToUpdateDto = (values: TaskFormData): UpdateTaskDto => ({
    title: values.title,
    description: values.description,
    status: values.status,
    priority: values.priority,
    dueDate: values.dueDate ?? undefined,
    estimatedHours: values.estimatedHours ?? undefined,
    actualHours: values.actualHours ?? undefined,
    assigneeId: values.assigneeId ?? undefined,
    tags: values.tags && values.tags.length > 0 ? values.tags : undefined,
    position: undefined as number | undefined // placeholder, assigned dynamically when needed
});

const useWorkspaceMembersForProject = (project: Project | null): ProjectMember[] => {
    const workspaceId = project?.workspaceId ?? null;
    const { members } = useWorkspaceDetails(workspaceId);
    return members ?? [];
};

export const ProjectsPage: React.FC = () => {
    const queryClient = useQueryClient();
    const { selectedWorkspaceId, setSelectedWorkspaceId } = useWorkspaceSelectionStore(state => ({
        selectedWorkspaceId: state.selectedWorkspaceId,
        setSelectedWorkspaceId: state.setSelectedWorkspaceId
    }));
    const { workspaces } = useWorkspaces();

    const {
        projects,
        isLoading: isProjectsLoading,
        isError: isProjectsError,
        createProject,
        updateProject,
        deleteProject,
        addMembers,
        removeMember,
        invalidate: invalidateProjects
    } = useProjects(selectedWorkspaceId);

    const [selectedProjectId, setSelectedProjectId] = React.useState<string | null>(null);
    const [isProjectDialogOpen, setProjectDialogOpen] = React.useState(false);
    const [projectDialogMode, setProjectDialogMode] = React.useState<'create' | 'edit'>('create');
    const [isMembersDialogOpen, setMembersDialogOpen] = React.useState(false);
    const [isTaskDialogOpen, setTaskDialogOpen] = React.useState(false);
    const [taskDialogDefaultStatus, setTaskDialogDefaultStatus] =
        React.useState<TaskStatus>('todo');
    const [taskBeingEdited, setTaskBeingEdited] = React.useState<ProjectTask | null>(null);
    const [isProcessingProject, setProcessingProject] = React.useState(false);
    const [isProcessingTask, setProcessingTask] = React.useState(false);
    const [isReordering, setIsReordering] = React.useState(false);

    const filteredProjects = React.useMemo(() => {
        if (!selectedWorkspaceId) {
            return projects;
        }
        return projects.filter(project => project.workspaceId === selectedWorkspaceId);
    }, [projects, selectedWorkspaceId]);

    React.useEffect(() => {
        if (filteredProjects.length === 0) {
            if (selectedProjectId !== null) {
                setSelectedProjectId(null);
            }
            return;
        }
        const exists = selectedProjectId
            ? filteredProjects.some(project => project.id === selectedProjectId)
            : false;
        if (!selectedProjectId || !exists) {
            setSelectedProjectId(filteredProjects[0].id);
        }
    }, [filteredProjects, selectedProjectId]);

    const activeProject = React.useMemo<Project | null>(() => {
        if (!selectedProjectId) {
            return null;
        }
        return projects.find(project => project.id === selectedProjectId) ?? null;
    }, [projects, selectedProjectId]);

    const {
        tasks,
        isLoading: isTasksLoading,
        isError: isTasksError,
        createTask,
        updateTask,
        updateTaskSilently,
        deleteTask,
        updateTaskPosition,
        invalidate: invalidateTasks
    } = useProjectTasks(selectedProjectId);

    const participants = React.useMemo<ProjectMember[]>(() => {
        if (!activeProject) {
            return [];
        }
        return getProjectParticipants(activeProject);
    }, [activeProject]);

    const workspaceMembers = useWorkspaceMembersForProject(activeProject);

    const { canManageProject, canManageMembers } = useProjectPermissions(activeProject);

    const boardColumns = React.useMemo(() => groupTasksByStatus(tasks), [tasks]);

    const workspaceOptions = React.useMemo(
        () => workspaces.map(workspace => ({ id: workspace.id, name: workspace.name })),
        [workspaces]
    );

    const handleOpenCreateProject = (): void => {
        setProjectDialogMode('create');
        setProjectDialogOpen(true);
    };

    const handleWorkspaceChange = React.useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            const { value } = event.target;
            setSelectedWorkspaceId(value === '' ? null : value);
        },
        [setSelectedWorkspaceId]
    );

    const handleOpenEditProject = (): void => {
        if (!activeProject) {
            return;
        }
        setProjectDialogMode('edit');
        setProjectDialogOpen(true);
    };

    const handleSubmitProject = async (values: ProjectFormValues): Promise<void> => {
        if (!values.workspaceId) {
            toast.error('Select a workspace for this project.');
            throw new Error('Workspace is required');
        }
        setProcessingProject(true);
        try {
            if (projectDialogMode === 'create') {
                await createProject(mapProjectFormToCreateDto(values));
            } else if (activeProject) {
                await updateProject(activeProject.id, mapProjectFormToUpdateDto(values));
            }
            setProjectDialogOpen(false);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to save project';
            toast.error(message);
            throw error;
        } finally {
            setProcessingProject(false);
        }
    };

    const handleDeleteProject = async (): Promise<void> => {
        if (!activeProject) {
            return;
        }
        const confirmDelete = window.confirm(
            `Delete project "${activeProject.name}"? This action cannot be undone.`
        );
        if (!confirmDelete) {
            return;
        }
        setProcessingProject(true);
        try {
            await deleteProject(activeProject.id);
            await invalidateProjects();
            setSelectedProjectId(null);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to delete project';
            toast.error(message);
        } finally {
            setProcessingProject(false);
        }
    };

    const handleOpenTaskDialog = (status: TaskStatus, task?: ProjectTask): void => {
        setTaskDialogDefaultStatus(status);
        setTaskBeingEdited(task ?? null);
        setTaskDialogOpen(true);
    };

    const handleSubmitTask = async (values: TaskFormData): Promise<void> => {
        if (!selectedProjectId) {
            toast.error('Select a project before managing tasks.');
            throw new Error('Project context missing');
        }
        setProcessingTask(true);
        try {
            if (taskBeingEdited) {
                const updatePayload = mapTaskFormToUpdateDto(values);
                updatePayload.position = taskBeingEdited.position;
                await updateTask(taskBeingEdited.id, updatePayload);
            } else {
                await createTask(mapTaskFormToCreateDto(selectedProjectId, values));
            }
            setTaskDialogOpen(false);
            setTaskBeingEdited(null);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to save task';
            toast.error(message);
            throw error;
        } finally {
            setProcessingTask(false);
        }
    };

    const handleDeleteTask = async (task: ProjectTask): Promise<void> => {
        const confirmed = window.confirm(`Delete task "${task.title}"?`);
        if (!confirmed) {
            return;
        }
        setProcessingTask(true);
        try {
            await deleteTask(task.id);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to delete task';
            toast.error(message);
        } finally {
            setProcessingTask(false);
        }
    };

    const handleManageMembers = (): void => {
        if (!activeProject) {
            return;
        }
        setMembersDialogOpen(true);
    };

    const handleAddMembers = async (memberIds: string[]): Promise<void> => {
        if (!activeProject || memberIds.length === 0) {
            return;
        }
        setProcessingProject(true);
        try {
            await addMembers(activeProject.id, memberIds);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to add members';
            toast.error(message);
            throw error;
        } finally {
            setProcessingProject(false);
        }
    };

    const handleRemoveMember = async (memberId: string): Promise<void> => {
        if (!activeProject) {
            return;
        }
        setProcessingProject(true);
        try {
            await removeMember(activeProject.id, memberId);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to remove member';
            toast.error(message);
            throw error;
        } finally {
            setProcessingProject(false);
        }
    };

    const handleDragEnd = React.useCallback(
        async (result: DropResult) => {
            if (!selectedProjectId) {
                return;
            }
            const { destination, source, draggableId } = result;
            if (!destination) {
                return;
            }
            if (
                destination.droppableId === source.droppableId &&
                destination.index === source.index
            ) {
                return;
            }

            const tasksQueryKey = PROJECT_TASKS_QUERY_KEY(selectedProjectId);
            const pendingUpdates: PendingTaskUpdate[] = [];

            queryClient.setQueryData<ProjectTask[]>(tasksQueryKey, prev => {
                if (!prev) {
                    return prev;
                }
                const prevMap = new Map(prev.map(task => [task.id, task]));
                const columns = groupTasksByStatus(prev);

                const sourceStatus = source.droppableId as TaskStatus;
                const destinationStatus = destination.droppableId as TaskStatus;

                const sourceTasks = [...columns[sourceStatus]];
                let movedTask: ProjectTask | undefined = sourceTasks[source.index];
                if (!movedTask) {
                    movedTask = prevMap.get(draggableId);
                    if (!movedTask) {
                        return prev;
                    }
                    const fallbackIndex = sourceTasks.findIndex(task => task.id === draggableId);
                    if (fallbackIndex >= 0) {
                        sourceTasks.splice(fallbackIndex, 1);
                    }
                } else {
                    sourceTasks.splice(source.index, 1);
                }

                const movedTaskClone: ProjectTask = { ...movedTask };

                if (sourceStatus === destinationStatus) {
                    sourceTasks.splice(destination.index, 0, movedTaskClone);
                    const updatedColumn = sourceTasks.map((task, index) => {
                        const updatedTask: ProjectTask = {
                            ...task,
                            position: (index + 1) * POSITION_STEP
                        };
                        const previous = prevMap.get(task.id);
                        if (
                            !previous ||
                            previous.position !== updatedTask.position ||
                            previous.status !== updatedTask.status
                        ) {
                            pendingUpdates.push({
                                id: updatedTask.id,
                                status: updatedTask.status,
                                position: updatedTask.position,
                                changedStatus: previous?.status !== updatedTask.status
                            });
                        }
                        return updatedTask;
                    });
                    columns[sourceStatus] = updatedColumn;
                } else {
                    const destinationTasks = [...columns[destinationStatus]];
                    const movedIntoDestination: ProjectTask = {
                        ...movedTaskClone,
                        status: destinationStatus
                    };
                    destinationTasks.splice(destination.index, 0, movedIntoDestination);

                    const updatedSource = sourceTasks.map((task, index) => {
                        const updatedTask: ProjectTask = {
                            ...task,
                            position: (index + 1) * POSITION_STEP,
                            status: sourceStatus
                        };
                        const previous = prevMap.get(task.id);
                        if (
                            !previous ||
                            previous.position !== updatedTask.position ||
                            previous.status !== updatedTask.status
                        ) {
                            pendingUpdates.push({
                                id: updatedTask.id,
                                status: updatedTask.status,
                                position: updatedTask.position,
                                changedStatus: previous?.status !== updatedTask.status
                            });
                        }
                        return updatedTask;
                    });

                    const updatedDestination = destinationTasks.map((task, index) => {
                        const updatedTask: ProjectTask = {
                            ...task,
                            position: (index + 1) * POSITION_STEP,
                            status: destinationStatus
                        };
                        const previous = prevMap.get(task.id);
                        if (
                            !previous ||
                            previous.position !== updatedTask.position ||
                            previous.status !== updatedTask.status
                        ) {
                            pendingUpdates.push({
                                id: updatedTask.id,
                                status: updatedTask.status,
                                position: updatedTask.position,
                                changedStatus: previous?.status !== updatedTask.status
                            });
                        }
                        return updatedTask;
                    });

                    columns[sourceStatus] = updatedSource;
                    columns[destinationStatus] = updatedDestination;
                }

                const updatedTasks = statusOrder.flatMap(status => columns[status]);
                return updatedTasks;
            });

            if (pendingUpdates.length === 0) {
                return;
            }

            setIsReordering(true);
            try {
                const deduped = new Map<string, PendingTaskUpdate>();
                pendingUpdates.forEach(update => {
                    deduped.set(update.id, update);
                });
                await Promise.all(
                    Array.from(deduped.values()).map(update =>
                        update.changedStatus
                            ? updateTaskSilently(update.id, {
                                  status: update.status,
                                  position: update.position
                              })
                            : updateTaskPosition(update.id, update.position)
                    )
                );
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Failed to reorder task';
                toast.error(message);
                await invalidateTasks();
            } finally {
                setIsReordering(false);
            }
        },
        [invalidateTasks, queryClient, selectedProjectId, updateTaskPosition, updateTaskSilently]
    );

    const availableMembers = React.useMemo<ProjectMember[]>(() => {
        if (!activeProject) {
            return [];
        }
        const memberIds = new Set(participants.map(member => member.id));
        return workspaceMembers.filter(member => !memberIds.has(member.id));
    }, [activeProject, participants, workspaceMembers]);

    const projectInitialValues = React.useMemo<Partial<ProjectFormValues> | undefined>(() => {
        if (!activeProject) {
            return undefined;
        }
        return {
            name: activeProject.name,
            description: activeProject.description ?? '',
            status: activeProject.status,
            priority: activeProject.priority,
            startDate: activeProject.startDate,
            endDate: activeProject.endDate,
            deadline: activeProject.deadline,
            budget: activeProject.budget ?? null,
            color: activeProject.color ?? '#2196f3',
            workspaceId: activeProject.workspaceId ?? selectedWorkspaceId ?? ''
        };
    }, [activeProject, selectedWorkspaceId]);

    const taskDialogInitialValues = React.useMemo<Partial<TaskFormData> | undefined>(() => {
        if (!taskBeingEdited) {
            return undefined;
        }
        return {
            title: taskBeingEdited.title,
            description: taskBeingEdited.description ?? '',
            status: taskBeingEdited.status,
            priority: taskBeingEdited.priority,
            dueDate: taskBeingEdited.dueDate ?? null,
            estimatedHours: taskBeingEdited.estimatedHours ?? null,
            actualHours: taskBeingEdited.actualHours ?? null,
            assigneeId: taskBeingEdited.assignee?.id ?? null,
            tags: taskBeingEdited.tags ?? []
        };
    }, [taskBeingEdited]);

    const projectSummary = buildProjectSummary(activeProject);

    const workspaceName = React.useMemo(() => {
        if (!activeProject?.workspaceId) {
            return null;
        }
        const workspace = workspaces.find(item => item.id === activeProject.workspaceId);
        return workspace?.name ?? activeProject.workspaceName ?? null;
    }, [activeProject, workspaces]);

    const handleTaskSubmit = (values: TaskFormData): Promise<void> => handleSubmitTask(values);

    const handleProjectSubmit = (values: ProjectFormValues): Promise<void> =>
        handleSubmitProject(values);

    return (
        <Box sx={{ display: 'flex', height: '100%', minHeight: '80vh' }}>
            <ProjectList
                projects={filteredProjects}
                selectedProjectId={selectedProjectId}
                onSelect={projectId => setSelectedProjectId(projectId)}
                onCreate={handleOpenCreateProject}
                isLoading={isProjectsLoading}
            />

            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', px: 3, py: 2, gap: 3 }}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="flex-start">
                    <Box sx={{ flex: 1 }}>
                        <Typography variant="h4" fontWeight={600} gutterBottom>
                            {activeProject ? activeProject.name : 'Projects'}
                        </Typography>
                        {activeProject ? (
                            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                                <Chip
                                    label={PROJECT_STATUS_METADATA[activeProject.status].label}
                                    sx={{
                                        bgcolor:
                                            PROJECT_STATUS_METADATA[activeProject.status].color,
                                        color: 'common.white'
                                    }}
                                    size="small"
                                />
                                <Chip
                                    label={PROJECT_PRIORITY_METADATA[activeProject.priority].label}
                                    sx={{
                                        bgcolor:
                                            PROJECT_PRIORITY_METADATA[activeProject.priority].color,
                                        color: 'common.white'
                                    }}
                                    size="small"
                                />
                                {workspaceName ? (
                                    <Chip label={workspaceName} size="small" variant="outlined" />
                                ) : null}
                                <Typography variant="body2" color="text.secondary">
                                    {participants.length} members • {tasks.length} tasks
                                </Typography>
                            </Stack>
                        ) : (
                            <Typography variant="body2" color="text.secondary">
                                Select a project to view its board.
                            </Typography>
                        )}
                        {projectSummary ? (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                {projectSummary}
                            </Typography>
                        ) : null}
                    </Box>

                    <Stack direction="row" spacing={1} alignItems="center">
                        {workspaceOptions.length > 0 ? (
                            <TextField
                                select
                                size="small"
                                label="Workspace"
                                value={selectedWorkspaceId ?? ''}
                                onChange={handleWorkspaceChange}
                                sx={{ minWidth: 200 }}
                            >
                                <MenuItem value="">All workspaces</MenuItem>
                                {workspaceOptions.map(option => (
                                    <MenuItem key={option.id} value={option.id}>
                                        {option.name}
                                    </MenuItem>
                                ))}
                            </TextField>
                        ) : null}
                        <Button
                            variant="outlined"
                            startIcon={<AddIcon fontSize="small" />}
                            onClick={handleOpenCreateProject}
                        >
                            New project
                        </Button>
                        {activeProject ? (
                            <>
                                <Tooltip title="Edit project">
                                    <span>
                                        <IconButton
                                            onClick={handleOpenEditProject}
                                            disabled={!canManageProject}
                                        >
                                            <EditIcon />
                                        </IconButton>
                                    </span>
                                </Tooltip>
                                <Tooltip title="Manage members">
                                    <span>
                                        <IconButton
                                            onClick={handleManageMembers}
                                            disabled={!canManageMembers}
                                        >
                                            <GroupIcon />
                                        </IconButton>
                                    </span>
                                </Tooltip>
                                <Tooltip title="Delete project">
                                    <span>
                                        <IconButton
                                            onClick={() => {
                                                void handleDeleteProject();
                                            }}
                                            disabled={!canManageProject || isProcessingProject}
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                    </span>
                                </Tooltip>
                            </>
                        ) : null}
                    </Stack>
                </Stack>

                <Divider />

                {isProjectsError ? (
                    <Alert severity="error">
                        We could not load your projects. Please refresh the page or try again later.
                    </Alert>
                ) : null}

                {activeProject ? (
                    isTasksError ? (
                        <Alert severity="error">
                            We could not load tasks for this project. Try reloading the page.
                        </Alert>
                    ) : (
                        <DragDropContext
                            onDragEnd={result => {
                                void handleDragEnd(result);
                            }}
                        >
                            <Stack
                                direction="row"
                                spacing={2}
                                alignItems="flex-start"
                                sx={{ overflowX: 'auto', pb: 2 }}
                            >
                                {statusOrder.map(status => {
                                    const columnTasks = boardColumns[status] ?? [];
                                    const statusMeta = TASK_STATUS_METADATA[status];
                                    return (
                                        <Droppable droppableId={status} key={status}>
                                            {provided => (
                                                <Box
                                                    ref={provided.innerRef}
                                                    {...provided.droppableProps}
                                                    sx={{
                                                        minWidth: 280,
                                                        maxWidth: 320,
                                                        flex: '0 0 auto',
                                                        bgcolor: 'background.paper',
                                                        borderRadius: 3,
                                                        border: theme =>
                                                            `1px solid ${theme.palette.divider}`,
                                                        p: 2,
                                                        minHeight: 480,
                                                        display: 'flex',
                                                        flexDirection: 'column'
                                                    }}
                                                >
                                                    <Stack
                                                        direction="row"
                                                        alignItems="center"
                                                        justifyContent="space-between"
                                                        sx={{ mb: 2 }}
                                                    >
                                                        <Stack
                                                            direction="row"
                                                            spacing={1}
                                                            alignItems="center"
                                                        >
                                                            <Avatar
                                                                sx={{
                                                                    width: 32,
                                                                    height: 32,
                                                                    bgcolor:
                                                                        statusMeta.label.includes(
                                                                            'Done'
                                                                        )
                                                                            ? 'success.main'
                                                                            : 'primary.main'
                                                                }}
                                                            >
                                                                {statusMeta.label.charAt(0)}
                                                            </Avatar>
                                                            <Box>
                                                                <Typography
                                                                    variant="subtitle1"
                                                                    fontWeight={600}
                                                                >
                                                                    {statusMeta.label}
                                                                </Typography>
                                                                <Typography
                                                                    variant="caption"
                                                                    color="text.secondary"
                                                                >
                                                                    {columnTasks.length} tasks
                                                                </Typography>
                                                            </Box>
                                                        </Stack>
                                                        <Tooltip title="Add task">
                                                            <span>
                                                                <IconButton
                                                                    size="small"
                                                                    color="primary"
                                                                    onClick={() =>
                                                                        handleOpenTaskDialog(status)
                                                                    }
                                                                    disabled={
                                                                        isProcessingTask ||
                                                                        isReordering
                                                                    }
                                                                >
                                                                    <AddIcon fontSize="small" />
                                                                </IconButton>
                                                            </span>
                                                        </Tooltip>
                                                    </Stack>

                                                    {isTasksLoading ? (
                                                        <Stack
                                                            alignItems="center"
                                                            justifyContent="center"
                                                            sx={{ flex: 1, py: 6 }}
                                                        >
                                                            <CircularProgress size={24} />
                                                        </Stack>
                                                    ) : columnTasks.length === 0 ? (
                                                        <Box
                                                            sx={{
                                                                flex: 1,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                textAlign: 'center',
                                                                color: 'text.secondary',
                                                                px: 2
                                                            }}
                                                        >
                                                            <Typography variant="body2">
                                                                No tasks yet. Add one to get
                                                                started.
                                                            </Typography>
                                                        </Box>
                                                    ) : (
                                                        <Stack spacing={2} sx={{ flex: 1 }}>
                                                            {columnTasks.map((task, index) => (
                                                                <Draggable
                                                                    key={task.id}
                                                                    draggableId={task.id}
                                                                    index={index}
                                                                    isDragDisabled={
                                                                        isProcessingTask ||
                                                                        isReordering
                                                                    }
                                                                >
                                                                    {dragProvided => (
                                                                        <Box
                                                                            ref={
                                                                                dragProvided.innerRef
                                                                            }
                                                                            {...dragProvided.draggableProps}
                                                                            {...dragProvided.dragHandleProps}
                                                                        >
                                                                            <TaskCard
                                                                                task={task}
                                                                                onEdit={edited =>
                                                                                    handleOpenTaskDialog(
                                                                                        edited.status,
                                                                                        edited
                                                                                    )
                                                                                }
                                                                                onDelete={deleted => {
                                                                                    void handleDeleteTask(
                                                                                        deleted
                                                                                    );
                                                                                }}
                                                                            />
                                                                        </Box>
                                                                    )}
                                                                </Draggable>
                                                            ))}
                                                            {provided.placeholder}
                                                        </Stack>
                                                    )}
                                                </Box>
                                            )}
                                        </Droppable>
                                    );
                                })}
                            </Stack>
                        </DragDropContext>
                    )
                ) : isProjectsLoading ? (
                    <Stack alignItems="center" justifyContent="center" sx={{ flex: 1, py: 6 }}>
                        <CircularProgress size={28} />
                    </Stack>
                ) : (
                    <Alert severity="info">
                        No projects available. Create a project to start organizing work.
                    </Alert>
                )}
            </Box>

            <ProjectFormDialog
                open={isProjectDialogOpen}
                onClose={() => setProjectDialogOpen(false)}
                title={projectDialogMode === 'create' ? 'Create project' : 'Edit project'}
                submitLabel={projectDialogMode === 'create' ? 'Create' : 'Save changes'}
                onSubmit={handleProjectSubmit}
                initialValues={projectInitialValues}
                isSubmitting={isProcessingProject}
                workspaceOptions={workspaceOptions}
                defaultWorkspaceId={selectedWorkspaceId}
            />

            <TaskFormDialog
                open={isTaskDialogOpen}
                onClose={() => {
                    if (isProcessingTask) {
                        return;
                    }
                    setTaskDialogOpen(false);
                    setTaskBeingEdited(null);
                }}
                title={taskBeingEdited ? 'Edit task' : 'Create task'}
                submitLabel={taskBeingEdited ? 'Save changes' : 'Create task'}
                defaultStatus={taskDialogDefaultStatus}
                initialValues={taskDialogInitialValues}
                participants={participants}
                isSubmitting={isProcessingTask}
                onSubmit={handleTaskSubmit}
            />

            <ProjectMembersDialog
                open={isMembersDialogOpen}
                projectName={activeProject?.name ?? ''}
                ownerId={activeProject?.owner?.id ?? null}
                members={participants}
                availableMembers={availableMembers}
                canManageMembers={canManageMembers}
                isSubmitting={isProcessingProject}
                onClose={() => setMembersDialogOpen(false)}
                onAddMembers={async memberIds => {
                    await handleAddMembers(memberIds);
                }}
                onRemoveMember={async memberId => {
                    await handleRemoveMember(memberId);
                }}
            />
        </Box>
    );
};
