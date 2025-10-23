import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import type { AddProjectMembersDto } from 'api/models/add-project-members-dto';
import type { CreateProjectDto } from 'api/models/create-project-dto';
import type { ProjectResponseDto } from 'api/models/project-response-dto';
import type { UpdateProjectDto } from 'api/models/update-project-dto';
import { apiClients } from 'services/api-clients';
import { mapProjectResponse, type Project } from '../types/project';

const PROJECTS_QUERY_KEY = ['projects'] as const;

interface UseProjectsResult {
    readonly projects: Project[];
    readonly isLoading: boolean;
    readonly isError: boolean;
    readonly refetch: () => Promise<unknown>;
    readonly createProject: (payload: CreateProjectDto) => Promise<void>;
    readonly updateProject: (id: string, payload: UpdateProjectDto) => Promise<void>;
    readonly deleteProject: (id: string) => Promise<void>;
    readonly addMembers: (id: string, memberIds: string[]) => Promise<void>;
    readonly removeMember: (id: string, memberId: string) => Promise<void>;
    readonly invalidate: () => Promise<void>;
}
export const useProjects = (workspaceId: string | null): UseProjectsResult => {
    const queryClient = useQueryClient();

    const queryKey = React.useMemo(
        () => [PROJECTS_QUERY_KEY[0], workspaceId ?? 'all'],
        [workspaceId]
    );

    const {
        data: projects = [],
        isLoading,
        isError,
        refetch
    } = useQuery<Project[]>({
        queryKey,
        queryFn: async () => {
            const response = await apiClients.projects.projectsControllerFindAll(
                workspaceId ?? undefined
            );
            const payload = response.data as unknown as ProjectResponseDto[];
            return payload.map(mapProjectResponse);
        }
    });

    const invalidate = React.useCallback(async (): Promise<void> => {
        await queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY });
    }, [queryClient]);

    const { mutateAsync: handleCreate } = useMutation({
        mutationFn: async (payload: CreateProjectDto) => {
            const response = await apiClients.projects.projectsControllerCreate(payload);
            return response.data as unknown as ProjectResponseDto;
        },
        onSuccess: data => {
            const project = mapProjectResponse(data);
            toast.success(`Project “${project.name}” created`);
            void invalidate();
        },
        onError: error => {
            toast.error(error instanceof Error ? error.message : 'Failed to create project');
        }
    });

    const { mutateAsync: handleUpdate } = useMutation({
        mutationFn: async ({ id, payload }: { id: string; payload: UpdateProjectDto }) => {
            const response = await apiClients.projects.projectsControllerUpdate(id, payload);
            return response.data as unknown as ProjectResponseDto;
        },
        onSuccess: data => {
            const project = mapProjectResponse(data);
            toast.success(`Project “${project.name}” updated`);
            void invalidate();
        },
        onError: error => {
            toast.error(error instanceof Error ? error.message : 'Failed to update project');
        }
    });

    const { mutateAsync: handleDelete } = useMutation({
        mutationFn: async (id: string) => {
            await apiClients.projects.projectsControllerRemove(id);
        },
        onSuccess: () => {
            toast.success('Project deleted');
            void invalidate();
        },
        onError: error => {
            toast.error(error instanceof Error ? error.message : 'Failed to delete project');
        }
    });

    const { mutateAsync: handleAddMembers } = useMutation({
        mutationFn: async ({ id, memberIds }: { id: string; memberIds: string[] }) => {
            const payload: AddProjectMembersDto = { memberIds };
            const response = await apiClients.projects.projectsControllerAddMembers(id, payload);
            return response.data as unknown as ProjectResponseDto;
        },
        onSuccess: () => {
            toast.success('Members added to project');
            void invalidate();
        },
        onError: error => {
            toast.error(error instanceof Error ? error.message : 'Failed to add members');
        }
    });

    const { mutateAsync: handleRemoveMember } = useMutation({
        mutationFn: async ({ id, memberId }: { id: string; memberId: string }) => {
            const response = await apiClients.projects.projectsControllerRemoveMember(id, memberId);
            return response.data as unknown as ProjectResponseDto;
        },
        onSuccess: () => {
            toast.success('Member removed from project');
            void invalidate();
        },
        onError: error => {
            toast.error(error instanceof Error ? error.message : 'Failed to remove member');
        }
    });

    return {
        projects,
        isLoading,
        isError,
        refetch,
        createProject: React.useCallback(
            async (payload: CreateProjectDto) => {
                await handleCreate(payload);
            },
            [handleCreate]
        ),
        updateProject: React.useCallback(
            async (id: string, payload: UpdateProjectDto) => {
                await handleUpdate({ id, payload });
            },
            [handleUpdate]
        ),
        deleteProject: React.useCallback(
            async (id: string) => {
                await handleDelete(id);
            },
            [handleDelete]
        ),
        addMembers: React.useCallback(
            async (id: string, memberIds: string[]) => {
                if (memberIds.length === 0) {
                    return;
                }
                await handleAddMembers({ id, memberIds });
            },
            [handleAddMembers]
        ),
        removeMember: React.useCallback(
            async (id: string, memberId: string) => {
                await handleRemoveMember({ id, memberId });
            },
            [handleRemoveMember]
        ),
        invalidate
    };
};
