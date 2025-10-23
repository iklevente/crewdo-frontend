import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { apiClients } from 'services/api-clients';
import type { CreateWorkspaceDto } from 'api/models/create-workspace-dto';
import type { UpdateWorkspaceDto } from 'api/models/update-workspace-dto';
import type { Workspace } from '../types/workspace';

export const WORKSPACES_QUERY_KEY = ['workspaces'];

interface UseWorkspacesResult {
    readonly workspaces: Workspace[];
    readonly isLoading: boolean;
    readonly isFetched: boolean;
    readonly isError: boolean;
    readonly refetch: () => Promise<unknown>;
    readonly createWorkspace: (payload: CreateWorkspaceDto) => Promise<void>;
    readonly updateWorkspace: (id: string, payload: UpdateWorkspaceDto) => Promise<void>;
    readonly deleteWorkspace: (id: string) => Promise<void>;
    readonly addWorkspaceMember: (workspaceId: string, email: string) => Promise<void>;
    readonly removeWorkspaceMember: (workspaceId: string, userId: string) => Promise<void>;
}

export const useWorkspaces = (): UseWorkspacesResult => {
    const queryClient = useQueryClient();

    const {
        data: workspaces = [],
        isLoading,
        isFetched,
        isError,
        refetch
    } = useQuery<Workspace[]>({
        queryKey: WORKSPACES_QUERY_KEY,
        queryFn: async () => {
            const response = await apiClients.workspaces.workspaceControllerFindAll();
            return response.data as unknown as Workspace[];
        }
    });

    const handleInvalidate = React.useCallback(() => {
        void queryClient.invalidateQueries({ queryKey: WORKSPACES_QUERY_KEY });
    }, [queryClient]);

    const { mutateAsync: handleCreate } = useMutation({
        mutationFn: async (payload: CreateWorkspaceDto) => {
            const response = await apiClients.workspaces.workspaceControllerCreate(payload);
            return response.data as unknown as Workspace;
        },
        onSuccess: created => {
            toast.success(`Workspace “${created.name}” created`);
            handleInvalidate();
        },
        onError: error => {
            toast.error(error instanceof Error ? error.message : 'Failed to create workspace');
        }
    });

    const { mutateAsync: handleUpdate } = useMutation({
        mutationFn: async ({ id, payload }: { id: string; payload: UpdateWorkspaceDto }) => {
            const response = await apiClients.workspaces.workspaceControllerUpdate(id, payload);
            return response.data as unknown as Workspace;
        },
        onSuccess: updated => {
            toast.success(`Workspace “${updated.name}” updated`);
            handleInvalidate();
        },
        onError: error => {
            toast.error(error instanceof Error ? error.message : 'Failed to update workspace');
        }
    });

    const { mutateAsync: handleDelete } = useMutation({
        mutationFn: async (id: string) => {
            await apiClients.workspaces.workspaceControllerRemove(id);
        },
        onSuccess: () => {
            toast.success('Workspace deleted');
            handleInvalidate();
        },
        onError: error => {
            toast.error(error instanceof Error ? error.message : 'Failed to delete workspace');
        }
    });

    const { mutateAsync: handleAddMember } = useMutation({
        mutationFn: async ({ workspaceId, email }: { workspaceId: string; email: string }) => {
            await apiClients.workspaces.workspaceControllerAddMember(workspaceId, email);
        },
        onSuccess: () => {
            toast.success('Member added to workspace');
            handleInvalidate();
        },
        onError: error => {
            toast.error(error instanceof Error ? error.message : 'Failed to add member');
        }
    });

    const { mutateAsync: handleRemoveMember } = useMutation({
        mutationFn: async ({ workspaceId, userId }: { workspaceId: string; userId: string }) => {
            await apiClients.workspaces.workspaceControllerRemoveMember(workspaceId, userId);
        },
        onSuccess: () => {
            toast.success('Member removed from workspace');
            handleInvalidate();
        },
        onError: error => {
            toast.error(error instanceof Error ? error.message : 'Failed to remove member');
        }
    });

    return {
        workspaces,
        isLoading,
        isFetched,
        isError,
        refetch,
        createWorkspace: React.useCallback(
            async (payload: CreateWorkspaceDto) => {
                await handleCreate(payload);
            },
            [handleCreate]
        ),
        updateWorkspace: React.useCallback(
            async (id: string, payload: UpdateWorkspaceDto) => {
                await handleUpdate({ id, payload });
            },
            [handleUpdate]
        ),
        deleteWorkspace: React.useCallback(
            async (id: string) => {
                await handleDelete(id);
            },
            [handleDelete]
        ),
        addWorkspaceMember: React.useCallback(
            async (workspaceId: string, email: string) => {
                await handleAddMember({ workspaceId, email });
            },
            [handleAddMember]
        ),
        removeWorkspaceMember: React.useCallback(
            async (workspaceId: string, userId: string) => {
                await handleRemoveMember({ workspaceId, userId });
            },
            [handleRemoveMember]
        )
    };
};
