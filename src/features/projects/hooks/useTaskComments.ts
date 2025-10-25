import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import type { CommentResponseDto } from 'api/models/comment-response-dto';
import type { CreateCommentDto } from 'api/models/create-comment-dto';
import type { UpdateCommentDto } from 'api/models/update-comment-dto';
import { apiClients } from 'services/api-clients';
import { mapCommentResponse, type TaskComment } from '../types/comment';

const TASK_COMMENTS_QUERY_KEY = (taskId: string): [string, string] => ['task-comments', taskId];

interface UpdatePayload {
    readonly id: string;
    readonly content: string;
}

interface UseTaskCommentsResult {
    readonly comments: TaskComment[];
    readonly isLoading: boolean;
    readonly isError: boolean;
    readonly isCreating: boolean;
    readonly isUpdating: boolean;
    readonly isDeleting: boolean;
    readonly createComment: (content: string) => Promise<TaskComment>;
    readonly updateComment: (payload: UpdatePayload) => Promise<TaskComment>;
    readonly deleteComment: (id: string) => Promise<void>;
    readonly invalidate: () => Promise<void>;
}

export const useTaskComments = (taskId: string | null): UseTaskCommentsResult => {
    const queryClient = useQueryClient();
    const queryKey = taskId ? TASK_COMMENTS_QUERY_KEY(taskId) : ['task-comments', 'none'];

    const {
        data: comments = [],
        isLoading,
        isError
    } = useQuery<TaskComment[]>({
        queryKey,
        enabled: Boolean(taskId),
        queryFn: async () => {
            if (!taskId) {
                return [];
            }
            const response = await apiClients.comments.commentsControllerFindByTaskId(taskId);
            const payload = response.data as unknown as CommentResponseDto[];
            return payload
                .map(mapCommentResponse)
                .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        }
    });

    const invalidate = React.useCallback(async (): Promise<void> => {
        if (!taskId) {
            return;
        }
        await queryClient.invalidateQueries({ queryKey: TASK_COMMENTS_QUERY_KEY(taskId) });
    }, [queryClient, taskId]);

    const { mutateAsync: handleCreate, isPending: isCreating } = useMutation({
        mutationFn: async (content: string) => {
            if (!taskId) {
                throw new Error('Task is required');
            }
            const payload: CreateCommentDto = {
                content,
                taskId
            };
            const response = await apiClients.comments.commentsControllerCreate(payload);
            return mapCommentResponse(response.data as unknown as CommentResponseDto);
        },
        onSuccess: comment => {
            toast.success('Comment added');
            queryClient.setQueryData<TaskComment[]>(queryKey, previous => {
                if (!previous) {
                    return [comment];
                }
                return [...previous, comment];
            });
        },
        onError: error => {
            toast.error(error instanceof Error ? error.message : 'Failed to add comment');
        }
    });

    const { mutateAsync: handleUpdate, isPending: isUpdating } = useMutation({
        mutationFn: async ({ id, content }: UpdatePayload) => {
            const payload: UpdateCommentDto = { content };
            const response = await apiClients.comments.commentsControllerUpdate(id, payload);
            return mapCommentResponse(response.data as unknown as CommentResponseDto);
        },
        onSuccess: comment => {
            queryClient.setQueryData<TaskComment[]>(queryKey, previous => {
                if (!previous) {
                    return [comment];
                }
                return previous.map(item => (item.id === comment.id ? comment : item));
            });
            toast.success('Comment updated');
        },
        onError: error => {
            toast.error(error instanceof Error ? error.message : 'Failed to update comment');
        }
    });

    const { mutateAsync: handleDelete, isPending: isDeleting } = useMutation({
        mutationFn: async (id: string) => {
            await apiClients.comments.commentsControllerRemove(id);
            return id;
        },
        onSuccess: removedId => {
            toast.success('Comment deleted');
            queryClient.setQueryData<TaskComment[]>(queryKey, previous => {
                if (!previous) {
                    return [];
                }
                return previous.filter(item => item.id !== removedId);
            });
        },
        onError: error => {
            toast.error(error instanceof Error ? error.message : 'Failed to delete comment');
        }
    });

    return {
        comments,
        isLoading,
        isError,
        isCreating,
        isUpdating,
        isDeleting,
        createComment: React.useCallback(
            async (content: string) => {
                const comment = await handleCreate(content);
                return comment;
            },
            [handleCreate]
        ),
        updateComment: React.useCallback(
            async (payload: UpdatePayload) => {
                const comment = await handleUpdate(payload);
                return comment;
            },
            [handleUpdate]
        ),
        deleteComment: React.useCallback(
            async (id: string) => {
                await handleDelete(id);
            },
            [handleDelete]
        ),
        invalidate
    };
};
