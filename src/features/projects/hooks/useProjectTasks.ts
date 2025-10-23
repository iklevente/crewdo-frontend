import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import type { CreateTaskDto } from 'api/models/create-task-dto';
import type { TaskResponseDto } from 'api/models/task-response-dto';
import type { UpdateTaskDto } from 'api/models/update-task-dto';
import { apiClients } from 'services/api-clients';
import { mapTaskResponse, type ProjectTask } from '../types/task';

export const PROJECT_TASKS_QUERY_KEY = (projectId: string): [string, string] => [
    'project-tasks',
    projectId
];

interface UseProjectTasksResult {
    readonly tasks: ProjectTask[];
    readonly isLoading: boolean;
    readonly isError: boolean;
    readonly refetch: () => Promise<unknown>;
    readonly createTask: (payload: CreateTaskDto) => Promise<ProjectTask | null>;
    readonly updateTask: (id: string, payload: UpdateTaskDto) => Promise<ProjectTask | null>;
    readonly updateTaskSilently: (
        id: string,
        payload: UpdateTaskDto
    ) => Promise<ProjectTask | null>;
    readonly deleteTask: (id: string) => Promise<void>;
    readonly updateTaskPosition: (id: string, position: number) => Promise<void>;
    readonly invalidate: () => Promise<void>;
}

export const useProjectTasks = (projectId: string | null): UseProjectTasksResult => {
    const queryClient = useQueryClient();
    const queryKey = projectId ? PROJECT_TASKS_QUERY_KEY(projectId) : ['project-tasks', 'none'];

    const {
        data: tasks = [],
        isLoading,
        isError,
        refetch
    } = useQuery<ProjectTask[]>({
        queryKey,
        enabled: Boolean(projectId),
        queryFn: async () => {
            if (!projectId) {
                return [];
            }
            const response = await apiClients.tasks.tasksControllerFindAll(projectId);
            const payload = response.data as unknown as TaskResponseDto[];
            return payload.map(mapTaskResponse).sort((a, b) => a.position - b.position);
        }
    });

    const invalidate = React.useCallback(async (): Promise<void> => {
        if (!projectId) {
            return;
        }
        await queryClient.invalidateQueries({ queryKey: PROJECT_TASKS_QUERY_KEY(projectId) });
    }, [projectId, queryClient]);

    const { mutateAsync: handleCreate } = useMutation({
        mutationFn: async (payload: CreateTaskDto) => {
            const response = await apiClients.tasks.tasksControllerCreate(payload);
            return response.data as unknown as TaskResponseDto;
        },
        onSuccess: () => {
            toast.success('Task created');
            void invalidate();
        },
        onError: error => {
            toast.error(error instanceof Error ? error.message : 'Failed to create task');
        }
    });

    const { mutateAsync: handleUpdate } = useMutation({
        mutationFn: async ({ id, payload }: { id: string; payload: UpdateTaskDto }) => {
            const response = await apiClients.tasks.tasksControllerUpdate(id, payload);
            return response.data as unknown as TaskResponseDto;
        },
        onSuccess: () => {
            toast.success('Task updated');
            void invalidate();
        },
        onError: error => {
            toast.error(error instanceof Error ? error.message : 'Failed to update task');
        }
    });

    const { mutateAsync: handleUpdateSilent } = useMutation({
        mutationFn: async ({ id, payload }: { id: string; payload: UpdateTaskDto }) => {
            const response = await apiClients.tasks.tasksControllerUpdate(id, payload);
            return response.data as unknown as TaskResponseDto;
        },
        onError: error => {
            toast.error(error instanceof Error ? error.message : 'Failed to update task');
        }
    });

    const { mutateAsync: handleRemove } = useMutation({
        mutationFn: async (id: string) => {
            await apiClients.tasks.tasksControllerRemove(id);
        },
        onSuccess: () => {
            toast.success('Task deleted');
            void invalidate();
        },
        onError: error => {
            toast.error(error instanceof Error ? error.message : 'Failed to delete task');
        }
    });

    const { mutateAsync: handleUpdatePosition } = useMutation({
        mutationFn: async ({ id, position }: { id: string; position: number }) => {
            await apiClients.tasks.tasksControllerUpdatePosition(id, {
                data: { position }
            });
        },
        onError: error => {
            toast.error(error instanceof Error ? error.message : 'Failed to reorder task');
        }
    });

    return {
        tasks,
        isLoading,
        isError,
        refetch,
        createTask: React.useCallback(
            async (payload: CreateTaskDto) => {
                const result = await handleCreate(payload);
                return result ? mapTaskResponse(result) : null;
            },
            [handleCreate]
        ),
        updateTask: React.useCallback(
            async (id: string, payload: UpdateTaskDto) => {
                const result = await handleUpdate({ id, payload });
                return result ? mapTaskResponse(result) : null;
            },
            [handleUpdate]
        ),
        updateTaskSilently: React.useCallback(
            async (id: string, payload: UpdateTaskDto) => {
                const result = await handleUpdateSilent({ id, payload });
                return result ? mapTaskResponse(result) : null;
            },
            [handleUpdateSilent]
        ),
        deleteTask: React.useCallback(
            async (id: string) => {
                await handleRemove(id);
            },
            [handleRemove]
        ),
        updateTaskPosition: React.useCallback(
            async (id: string, position: number) => {
                await handleUpdatePosition({ id, position });
            },
            [handleUpdatePosition]
        ),
        invalidate
    };
};
