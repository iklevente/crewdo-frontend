import React from 'react';
import { CallRoomOverlay } from '../components/CallRoomOverlay';
import { useCallById } from '../hooks/useCallById';
import { useCallSession } from '../hooks/useCallSession';
import { useCallMutations } from '../hooks/useCallMutations';
import type { CallSummary, CallSessionCredentials } from '../types/call';

interface PendingJoinPreferences {
    readonly mic: boolean;
    readonly video: boolean;
}

interface CallOverlayState {
    readonly activeCallId: string | null;
    readonly sessionEnabled: boolean;
    readonly overlayMode: 'full' | 'docked';
    readonly pendingJoinPreferences: PendingJoinPreferences | null;
}

interface CallOverlayActions {
    readonly setActiveCallId: (callId: string | null) => void;
    readonly setSessionEnabled: (enabled: boolean) => void;
    readonly setOverlayMode: (mode: 'full' | 'docked') => void;
    readonly setPendingJoinPreferences: (prefs: PendingJoinPreferences | null) => void;
    readonly resetOverlay: () => void;
}

interface CallOverlayContextValue {
    readonly state: CallOverlayState;
    readonly actions: CallOverlayActions;
    readonly mutations: ReturnType<typeof useCallMutations>;
}

const CallOverlayContext = React.createContext<CallOverlayContextValue | null>(null);

const normalizeCall = (call: CallSummary | null | undefined): CallSummary | null => {
    return call ?? null;
};

const normalizeSession = (
    session: CallSessionCredentials | null | undefined
): CallSessionCredentials | null => {
    return session ?? null;
};

export const CallOverlayProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
    const [activeCallId, setActiveCallId] = React.useState<string | null>(null);
    const [sessionEnabled, setSessionEnabled] = React.useState(false);
    const [overlayMode, setOverlayMode] = React.useState<'full' | 'docked'>('full');
    const [pendingJoinPreferences, setPendingJoinPreferences] =
        React.useState<PendingJoinPreferences | null>(null);

    const callMutations = useCallMutations();
    const { joinCall, leaveCall, updateParticipant } = callMutations;

    const { data: callData } = useCallById(activeCallId);
    const normalizedCall = normalizeCall(callData);

    const shouldFetchSession = Boolean(activeCallId) && sessionEnabled;
    const sessionQuery = useCallSession(activeCallId, shouldFetchSession);
    const normalizedSession = normalizeSession(sessionQuery.data);

    const isSessionLoading =
        joinCall.isPending || sessionQuery.isLoading || sessionQuery.isFetching;

    const resetOverlay = React.useCallback((): void => {
        setActiveCallId(null);
        setSessionEnabled(false);
        setOverlayMode('full');
        setPendingJoinPreferences(null);
        joinCall.reset();
    }, [joinCall]);

    const handleLeaveCall = React.useCallback((): void => {
        if (!activeCallId) {
            return;
        }
        leaveCall.mutate(
            { callId: activeCallId },
            {
                onSuccess: () => {
                    resetOverlay();
                }
            }
        );
    }, [activeCallId, leaveCall, resetOverlay]);

    const handleCloseOverlay = React.useCallback((): void => {
        if (sessionEnabled) {
            handleLeaveCall();
        } else {
            resetOverlay();
        }
    }, [handleLeaveCall, resetOverlay, sessionEnabled]);

    const handleMinimize = React.useCallback((): void => {
        setOverlayMode('docked');
    }, []);

    const handleExpand = React.useCallback((): void => {
        setOverlayMode('full');
    }, []);

    const handleUpdateParticipantState = React.useCallback(
        (payload: {
            readonly callId: string;
            readonly isMuted?: boolean;
            readonly isVideoEnabled?: boolean;
            readonly isScreenSharing?: boolean;
        }): void => {
            updateParticipant.mutate(payload);
        },
        [updateParticipant]
    );

    const updateActiveCallId = React.useCallback((callId: string | null): void => {
        setActiveCallId(callId);
    }, []);

    const updateSessionEnabled = React.useCallback((enabled: boolean): void => {
        setSessionEnabled(enabled);
    }, []);

    const updateOverlayMode = React.useCallback((mode: 'full' | 'docked'): void => {
        setOverlayMode(mode);
    }, []);

    const updatePendingPreferences = React.useCallback(
        (prefs: PendingJoinPreferences | null): void => {
            setPendingJoinPreferences(prefs);
        },
        []
    );

    const contextValue = React.useMemo<CallOverlayContextValue>(
        () => ({
            state: {
                activeCallId,
                sessionEnabled,
                overlayMode,
                pendingJoinPreferences
            },
            actions: {
                setActiveCallId: updateActiveCallId,
                setSessionEnabled: updateSessionEnabled,
                setOverlayMode: updateOverlayMode,
                setPendingJoinPreferences: updatePendingPreferences,
                resetOverlay
            },
            mutations: callMutations
        }),
        [
            activeCallId,
            sessionEnabled,
            overlayMode,
            pendingJoinPreferences,
            updateActiveCallId,
            updateSessionEnabled,
            updateOverlayMode,
            updatePendingPreferences,
            resetOverlay,
            callMutations
        ]
    );

    return (
        <CallOverlayContext.Provider value={contextValue}>
            {children}
            <CallRoomOverlay
                open={Boolean(activeCallId)}
                call={normalizedCall}
                session={normalizedSession}
                onLeaveCall={handleLeaveCall}
                onClose={handleCloseOverlay}
                onMinimize={handleMinimize}
                onExpand={handleExpand}
                isLeaving={leaveCall.isPending}
                isSessionLoading={isSessionLoading}
                onUpdateParticipantState={handleUpdateParticipantState}
                preferredMicEnabled={pendingJoinPreferences?.mic}
                preferredCameraEnabled={pendingJoinPreferences?.video}
                mode={overlayMode}
            />
        </CallOverlayContext.Provider>
    );
};

export const useCallOverlay = (): CallOverlayContextValue => {
    const context = React.useContext(CallOverlayContext);
    if (!context) {
        throw new Error('useCallOverlay must be used within a CallOverlayProvider');
    }
    return context;
};
