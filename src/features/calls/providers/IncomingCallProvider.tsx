import React, { createContext, useContext, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { IncomingCallModal, type IncomingCallData } from '../components/IncomingCallModal';
import { useCallOverlay } from './CallOverlayProvider';

interface IncomingCallContextValue {
    readonly showIncomingCall: (call: IncomingCallData) => void;
    readonly dismissIncomingCall: () => void;
}

const IncomingCallContext = createContext<IncomingCallContextValue | null>(null);

export const useIncomingCall = (): IncomingCallContextValue => {
    const context = useContext(IncomingCallContext);
    if (!context) {
        throw new Error('useIncomingCall must be used within IncomingCallProvider');
    }
    return context;
};

interface IncomingCallProviderProps {
    readonly children: React.ReactNode;
}

export const IncomingCallProvider: React.FC<IncomingCallProviderProps> = ({ children }) => {
    const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const {
        actions: { setActiveCallId, setSessionEnabled, setOverlayMode, setPendingJoinPreferences },
        mutations: { joinCall }
    } = useCallOverlay();

    const showIncomingCall = useCallback((call: IncomingCallData) => {
        console.log('[IncomingCallProvider] Showing incoming call:', call);
        setIncomingCall(call);
        setIsModalOpen(true);
    }, []);

    const dismissIncomingCall = useCallback(() => {
        console.log('[IncomingCallProvider] Dismissing incoming call');
        setIsModalOpen(false);
        // Small delay before clearing the call data to allow modal animation
        setTimeout(() => {
            setIncomingCall(null);
        }, 300);
    }, []);

    const handleAccept = useCallback(
        (callId: string, options: { withVideo: boolean; withAudio: boolean }) => {
            console.log('[IncomingCallProvider] Accepting call:', callId, options);
            dismissIncomingCall();

            // Set up the call overlay with preferences
            setPendingJoinPreferences({ mic: options.withAudio, video: options.withVideo });
            setActiveCallId(callId);
            setSessionEnabled(false);
            setOverlayMode('full');

            // Join the call via API
            joinCall.reset();
            joinCall.mutate(
                {
                    callId,
                    withVideo: options.withVideo,
                    withAudio: options.withAudio
                },
                {
                    onSuccess: () => {
                        setSessionEnabled(true);
                        toast.success('Joined call');
                    },
                    onError: error => {
                        console.error('[IncomingCallProvider] Failed to join call:', error);
                        const message =
                            error instanceof Error ? error.message : 'Failed to join call';
                        toast.error(message);
                        // Reset overlay state on error
                        setActiveCallId(null);
                        setSessionEnabled(false);
                    }
                }
            );
        },
        [
            dismissIncomingCall,
            setPendingJoinPreferences,
            setActiveCallId,
            setSessionEnabled,
            setOverlayMode,
            joinCall
        ]
    );

    const handleDecline = useCallback(
        (callId: string) => {
            console.log('[IncomingCallProvider] Declining call:', callId);
            dismissIncomingCall();
            toast('Call declined', { icon: '📞' });
            // Note: We don't call the leave API because the user was never actually in the call
            // They just declined the invitation
        },
        [dismissIncomingCall]
    );

    const contextValue = React.useMemo<IncomingCallContextValue>(
        () => ({
            showIncomingCall,
            dismissIncomingCall
        }),
        [showIncomingCall, dismissIncomingCall]
    );

    return (
        <IncomingCallContext.Provider value={contextValue}>
            {children}
            <IncomingCallModal
                open={isModalOpen}
                call={incomingCall}
                onAccept={handleAccept}
                onDecline={handleDecline}
            />
        </IncomingCallContext.Provider>
    );
};
