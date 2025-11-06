import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import type { AxiosError } from 'axios';
import { apiClients } from 'services/api-clients';
import type { CallResponseDto } from 'api/models/call-response-dto';
import type { UpdateCallParticipantDto } from 'api/models/update-call-participant-dto';
import { CALLS_QUERY_KEY } from './useCalls';

interface StartCallVariables {
    readonly type: 'voice' | 'video';
    readonly title?: string;
    readonly invitedUserIds: string[];
    readonly withVideo: boolean;
    readonly withAudio: boolean;
}

interface ScheduleCallVariables {
    readonly type: 'voice' | 'video';
    readonly title: string;
    readonly description?: string;
    readonly scheduledStartTime: string;
    readonly scheduledEndTime?: string;
    readonly invitedUserIds: string[];
}

interface JoinCallVariables {
    readonly callId: string;
    readonly withVideo: boolean;
    readonly withAudio: boolean;
}

interface SimpleCallVariables {
    readonly callId: string;
}

interface UpdateParticipantVariables {
    readonly callId: string;
    readonly isMuted?: boolean;
    readonly isVideoEnabled?: boolean;
    readonly isScreenSharing?: boolean;
}

interface ErrorPayload {
    readonly message?: string;
}

const extractErrorMessage = (error: unknown): string => {
    if (!error) {
        return 'Unexpected error';
    }

    if (typeof error === 'string') {
        return error;
    }

    const axiosError = error as AxiosError<ErrorPayload>;
    const responseMessage = axiosError.response?.data?.message;
    if (responseMessage) {
        return Array.isArray(responseMessage) ? responseMessage.join(', ') : responseMessage;
    }

    if (axiosError.message) {
        return axiosError.message;
    }

    return error instanceof Error ? error.message : 'Unexpected error';
};

const normalizeOptionalText = (value?: string): string | undefined => {
    const trimmed = value?.trim();
    if (!trimmed) {
        return undefined;
    }
    return trimmed;
};

interface CallMutations {
    readonly startCall: UseMutationResult<CallResponseDto, unknown, StartCallVariables, unknown>;
    readonly scheduleCall: UseMutationResult<
        CallResponseDto,
        unknown,
        ScheduleCallVariables,
        unknown
    >;
    readonly joinCall: UseMutationResult<void, unknown, JoinCallVariables, unknown>;
    readonly leaveCall: UseMutationResult<void, unknown, SimpleCallVariables, unknown>;
    readonly endCall: UseMutationResult<void, unknown, SimpleCallVariables, unknown>;
    readonly updateParticipant: UseMutationResult<
        void,
        unknown,
        UpdateParticipantVariables,
        unknown
    >;
}

export const useCallMutations = (): CallMutations => {
    const queryClient = useQueryClient();

    const invalidateCalls = async (): Promise<void> => {
        await queryClient.invalidateQueries({ queryKey: CALLS_QUERY_KEY });
    };

    const handleMutationError = (error: unknown): void => {
        toast.error(extractErrorMessage(error));
    };

    const startCall = useMutation({
        mutationFn: async ({
            type,
            title,
            invitedUserIds,
            withVideo,
            withAudio
        }: StartCallVariables): Promise<CallResponseDto> => {
            const payload = {
                type,
                title: normalizeOptionalText(title),
                invitedUserIds: invitedUserIds.filter((id): id is string => Boolean(id)),
                withVideo,
                withAudio
            };
            const response = await apiClients.calls.callControllerStartCall(payload);
            return response.data;
        },
        onSuccess: async (data: CallResponseDto): Promise<void> => {
            toast.success('Call started');
            if (data?.id) {
                queryClient.setQueryData(['call', data.id], data);
            }
            await invalidateCalls();
        },
        onError: (error: unknown): void => {
            handleMutationError(error);
        }
    });

    const scheduleCall = useMutation({
        mutationFn: async ({
            type,
            title,
            description,
            scheduledStartTime,
            scheduledEndTime,
            invitedUserIds
        }: ScheduleCallVariables): Promise<CallResponseDto> => {
            const payload = {
                type,
                title: title.trim(),
                description: normalizeOptionalText(description),
                scheduledStartTime,
                scheduledEndTime,
                invitedUserIds: invitedUserIds.filter((id): id is string => Boolean(id))
            };
            const response = await apiClients.calls.callControllerScheduleCall(payload);
            return response.data;
        },
        onSuccess: async (data: CallResponseDto): Promise<void> => {
            toast.success('Call scheduled');
            if (data?.id) {
                queryClient.setQueryData(['call', data.id], data);
            }
            await invalidateCalls();
        },
        onError: (error: unknown): void => {
            handleMutationError(error);
        }
    });

    const joinCall = useMutation({
        mutationFn: async ({ callId, withVideo, withAudio }: JoinCallVariables): Promise<void> => {
            await apiClients.calls.callControllerJoinCall(callId, {
                callId,
                withVideo,
                withAudio
            });
        },
        onSuccess: async (): Promise<void> => {
            toast.success('Joined call');
            await invalidateCalls();
        },
        onError: (error: unknown): void => {
            handleMutationError(error);
        }
    });

    const leaveCall = useMutation({
        mutationFn: async ({ callId }: SimpleCallVariables): Promise<void> => {
            await apiClients.calls.callControllerLeaveCall(callId);
        },
        onSuccess: async (): Promise<void> => {
            toast.success('Left call');
            await invalidateCalls();
        },
        onError: (error: unknown): void => {
            handleMutationError(error);
        }
    });

    const endCall = useMutation({
        mutationFn: async ({ callId }: SimpleCallVariables): Promise<void> => {
            await apiClients.calls.callControllerEndCall(callId);
        },
        onSuccess: async (): Promise<void> => {
            toast.success('Call ended');
            await invalidateCalls();
        },
        onError: (error: unknown): void => {
            handleMutationError(error);
        }
    });

    const updateParticipant = useMutation({
        mutationFn: async ({ callId, ...rest }: UpdateParticipantVariables): Promise<void> => {
            const payload: UpdateCallParticipantDto = {};
            if (typeof rest.isMuted === 'boolean') {
                payload.isMuted = rest.isMuted;
            }
            if (typeof rest.isVideoEnabled === 'boolean') {
                payload.isVideoEnabled = rest.isVideoEnabled;
            }
            if (typeof rest.isScreenSharing === 'boolean') {
                payload.isScreenSharing = rest.isScreenSharing;
            }

            await apiClients.calls.callControllerUpdateParticipant(callId, payload);
        },
        onSuccess: async (_data, variables): Promise<void> => {
            await invalidateCalls();
            await queryClient.invalidateQueries({ queryKey: ['call', variables.callId] });
        },
        onError: (error: unknown): void => {
            handleMutationError(error);
        }
    });

    return {
        startCall,
        scheduleCall,
        joinCall,
        leaveCall,
        endCall,
        updateParticipant
    };
};
