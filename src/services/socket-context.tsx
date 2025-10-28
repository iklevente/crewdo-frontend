import React from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAuthStore } from 'store/auth-store';
import { PresenceStatus, usePresenceStore } from 'store/presence-store';
import { presenceApi } from 'services/presence-api';
import { refreshAccessToken } from 'services/api-clients';

interface SocketContextValue {
    readonly socket: Socket | null;
    readonly isConnected: boolean;
    readonly joinChannel: (channelId: string) => void;
    readonly leaveChannel: (channelId: string) => void;
}

const SocketContext = React.createContext<SocketContextValue | undefined>(undefined);

const AUTH_RETRY_INTERVAL_MS = 5000;
const SERVER_DISCONNECT_RESET_MS = 30000;
const MAX_CONSECUTIVE_SERVER_DISCONNECTS = 6;

const resolveSocketUrl = (): string => {
    const apiBase = process.env.API_BASE_URL;
    if (apiBase?.startsWith('http')) {
        try {
            const url = new URL(apiBase);
            url.pathname = '/';
            return url.origin;
        } catch (error) {
            console.warn('Failed to parse API_BASE_URL for socket connection:', error);
        }
    }

    if (typeof window !== 'undefined') {
        return window.location.origin;
    }

    return 'http://localhost:3000';
};

const createSocket = (): Socket | null => {
    if (typeof window === 'undefined') {
        return null;
    }

    return io(resolveSocketUrl(), {
        transports: ['websocket'],
        withCredentials: true,
        autoConnect: false
    });
};

export const SocketProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
    const accessToken = useAuthStore(state => state.accessToken);
    const refreshToken = useAuthStore(state => state.refreshToken);
    const currentUserId = useAuthStore(state => state.user?.id ?? null);
    const [isConnected, setIsConnected] = React.useState(false);
    const [socket] = React.useState<Socket | null>(() => createSocket());
    const socketRef = React.useRef<Socket | null>(socket);
    const joinedChannelIdsRef = React.useRef<Set<string>>(new Set());
    const previousTokenRef = React.useRef<string | null>(null);
    const isRefreshingRef = React.useRef(false);
    const lastAuthAttemptRef = React.useRef(0);
    const consecutiveServerDisconnectsRef = React.useRef(0);
    const lastServerDisconnectTimestampRef = React.useRef(0);

    const ensurePresenceSnapshot = React.useCallback(async (): Promise<void> => {
        try {
            const [current, snapshot] = await Promise.all([
                presenceApi.fetchCurrent().catch(() => null),
                presenceApi.fetchAll().catch(() => [])
            ]);

            if (current) {
                usePresenceStore
                    .getState()
                    .setPresence(current.userId, presenceApi.toStateEntry(current));
            }

            if (Array.isArray(snapshot) && snapshot.length > 0) {
                const updates = snapshot.map(item => ({
                    userId: item.userId,
                    entry: presenceApi.toStateEntry(item)
                }));
                usePresenceStore.getState().setMany(updates);
            }
        } catch (error) {
            console.warn('Failed to refresh presence state after reconnect:', error);
        }
    }, []);

    const normalizeStatus = React.useCallback((value?: string): PresenceStatus => {
        const normalized = (value ?? '').toLowerCase();
        if (normalized === 'online' || normalized === 'away' || normalized === 'busy') {
            return normalized as PresenceStatus;
        }
        return 'offline';
    }, []);

    const attemptReauthentication = React.useCallback(async () => {
        if (isRefreshingRef.current) {
            return;
        }

        const now = Date.now();
        const timeSinceLastAttempt = now - lastAuthAttemptRef.current;
        if (timeSinceLastAttempt < AUTH_RETRY_INTERVAL_MS) {
            return;
        }

        lastAuthAttemptRef.current = now;

        if (!refreshToken) {
            useAuthStore.getState().clearAuth();
            return;
        }

        isRefreshingRef.current = true;

        try {
            const newToken = await refreshAccessToken();
            if (!newToken) {
                return;
            }

            const activeSocket = socketRef.current;
            previousTokenRef.current = newToken;

            if (activeSocket) {
                activeSocket.auth = { ...(activeSocket.auth ?? {}), token: newToken };
                if (activeSocket.connected) {
                    activeSocket.disconnect();
                }
                activeSocket.connect();
            }
        } catch (error) {
            console.warn('Socket token refresh failed:', error);
        } finally {
            isRefreshingRef.current = false;
        }
    }, [refreshToken]);

    const isAuthenticationError = React.useCallback((error: unknown): boolean => {
        if (!error || typeof error !== 'object') {
            return false;
        }

        const { message, data } = error as { message?: unknown; data?: unknown };
        const baseMessage = typeof message === 'string' ? message.toLowerCase() : '';
        const dataMessage =
            typeof (data as { message?: string } | undefined)?.message === 'string'
                ? ((data as { message?: string })?.message ?? '').toLowerCase()
                : '';
        const statusCode = (data as { statusCode?: number } | undefined)?.statusCode;

        if (statusCode === 401 || statusCode === 403) {
            return true;
        }

        return (
            baseMessage.includes('jwt') ||
            baseMessage.includes('token') ||
            baseMessage.includes('auth') ||
            dataMessage.includes('jwt') ||
            dataMessage.includes('token') ||
            dataMessage.includes('auth')
        );
    }, []);

    React.useEffect(() => {
        socketRef.current = socket;
    }, [socket]);

    React.useEffect(() => {
        if (!socket) {
            return;
        }

        const handleConnect = (): void => {
            console.log('[Socket] Connected successfully!');
            setIsConnected(true);

            consecutiveServerDisconnectsRef.current = 0;
            lastAuthAttemptRef.current = 0;
            lastServerDisconnectTimestampRef.current = 0;

            if (currentUserId) {
                usePresenceStore.getState().ensureOnline(currentUserId);
            }

            joinedChannelIdsRef.current.forEach(channelId => {
                socket.emit('join_channel', { channelId });
            });

            void ensurePresenceSnapshot();
        };

        const handleDisconnect = (reason: string): void => {
            console.info('Socket disconnected:', reason);
            setIsConnected(false);

            if (reason === 'io server disconnect') {
                const now = Date.now();
                if (now - lastServerDisconnectTimestampRef.current > SERVER_DISCONNECT_RESET_MS) {
                    consecutiveServerDisconnectsRef.current = 0;
                }

                consecutiveServerDisconnectsRef.current += 1;
                lastServerDisconnectTimestampRef.current = now;

                if (consecutiveServerDisconnectsRef.current >= MAX_CONSECUTIVE_SERVER_DISCONNECTS) {
                    console.warn(
                        'Too many server disconnects, clearing auth state to prevent loops.'
                    );
                    useAuthStore.getState().clearAuth();
                    return;
                }

                void attemptReauthentication();
            }
        };

        const handleConnectError = (error: Error): void => {
            console.error('[Socket] Connection error:', error);
            if (isAuthenticationError(error)) {
                console.log('[Socket] Authentication error detected, attempting refresh');
                void attemptReauthentication();
            }
        };

        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);
        socket.on('connect_error', handleConnectError);

        return () => {
            socket.off('connect', handleConnect);
            socket.off('disconnect', handleDisconnect);
            socket.off('connect_error', handleConnectError);
        };
    }, [
        socket,
        currentUserId,
        attemptReauthentication,
        ensurePresenceSnapshot,
        isAuthenticationError
    ]);

    React.useEffect(() => {
        if (!socket) {
            return;
        }

        const handlePresenceUpdate = (payload: {
            userId: string;
            status: string;
            customStatus?: string | null;
            statusSource?: string;
            manualStatus?: string | null;
            manualCustomStatus?: string | null;
            lastSeenAt?: string | null;
            timestamp?: string;
        }): void => {
            if (!payload?.userId) {
                return;
            }

            usePresenceStore.getState().setPresence(payload.userId, {
                status: normalizeStatus(payload.status),
                customStatus: payload.customStatus,
                statusSource: (payload.statusSource ?? 'auto') as 'auto' | 'manual',
                manualStatus: payload.manualStatus ? normalizeStatus(payload.manualStatus) : null,
                manualCustomStatus: payload.manualCustomStatus ?? null,
                lastSeenAt: payload.lastSeenAt ?? null,
                timestamp: payload.timestamp
            });
        };

        const handlePresenceSnapshot = (
            payload:
                | {
                      userId: string;
                      status: string;
                      customStatus?: string | null;
                      statusSource?: string;
                      manualStatus?: string | null;
                      manualCustomStatus?: string | null;
                      lastSeenAt?: string | null;
                      timestamp?: string;
                  }[]
                | undefined
        ): void => {
            if (!payload || payload.length === 0) {
                return;
            }

            const updates = payload
                .filter(item => Boolean(item?.userId))
                .map(item => ({
                    userId: item.userId,
                    entry: {
                        status: normalizeStatus(item.status),
                        customStatus: item.customStatus,
                        statusSource: (item.statusSource ?? 'auto') as 'auto' | 'manual',
                        manualStatus: item.manualStatus ? normalizeStatus(item.manualStatus) : null,
                        manualCustomStatus: item.manualCustomStatus ?? null,
                        lastSeenAt: item.lastSeenAt ?? null,
                        timestamp: item.timestamp
                    }
                }));

            if (updates.length > 0) {
                usePresenceStore.getState().setMany(updates);
            }
        };

        socket.on('presence_updated', handlePresenceUpdate);
        socket.on('presence_snapshot', handlePresenceSnapshot);

        return () => {
            socket.off('presence_updated', handlePresenceUpdate);
            socket.off('presence_snapshot', handlePresenceSnapshot);
        };
    }, [socket, normalizeStatus]);

    React.useEffect(() => {
        if (!socket) {
            return;
        }

        if (!accessToken) {
            previousTokenRef.current = null;
            if (socket.connected || socket.active) {
                socket.disconnect();
            }
            usePresenceStore.getState().clear();
            return;
        }

        const previousToken = previousTokenRef.current;
        previousTokenRef.current = accessToken;

        console.log('[Socket] Setting auth token, has token:', Boolean(accessToken));
        socket.auth = { ...(socket.auth ?? {}), token: accessToken };

        if (socket.connected) {
            if (previousToken && previousToken !== accessToken) {
                console.log('[Socket] Token changed, reconnecting');
                socket.disconnect();
                socket.connect();
            }
        } else if (!socket.active) {
            console.log('[Socket] Not connected, attempting to connect');
            socket.connect();
        }
    }, [socket, accessToken]);

    const joinChannel = React.useCallback((channelId: string) => {
        if (!channelId) {
            return;
        }

        const activeSocket = socketRef.current;
        if (!activeSocket) {
            return;
        }

        joinedChannelIdsRef.current.add(channelId);
        if (activeSocket.connected) {
            activeSocket.emit('join_channel', { channelId });
        }
    }, []);

    const leaveChannel = React.useCallback((channelId: string) => {
        if (!channelId) {
            return;
        }

        const activeSocket = socketRef.current;
        if (!activeSocket) {
            return;
        }

        joinedChannelIdsRef.current.delete(channelId);
        if (activeSocket.connected) {
            activeSocket.emit('leave_channel', { channelId });
        }
    }, []);

    const value = React.useMemo<SocketContextValue>(
        () => ({ socket: socketRef.current, isConnected, joinChannel, leaveChannel }),
        [isConnected, joinChannel, leaveChannel]
    );

    return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

export const useSocket = (): SocketContextValue => {
    const context = React.useContext(SocketContext);
    if (!context) {
        throw new Error('useSocket must be used within a SocketProvider');
    }
    return context;
};
