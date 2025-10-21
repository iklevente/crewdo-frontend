import React from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAuthStore } from 'store/auth-store';
import { PresenceStatus, usePresenceStore } from 'store/presence-store';
import { presenceApi } from 'services/presence-api';

interface SocketContextValue {
    readonly socket: Socket | null;
    readonly isConnected: boolean;
    readonly joinChannel: (channelId: string) => void;
    readonly leaveChannel: (channelId: string) => void;
}

const SocketContext = React.createContext<SocketContextValue | undefined>(undefined);

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

const joinedChannelsRef = new WeakMap<Socket, Set<string>>();

export const SocketProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
    const accessToken = useAuthStore(state => state.accessToken);
    const currentUserId = useAuthStore(state => state.user?.id ?? null);
    const [isConnected, setIsConnected] = React.useState(false);
    const socketRef = React.useRef<Socket | null>(null);

    React.useEffect(() => {
        const existingSocket = socketRef.current;
        if (existingSocket) {
            existingSocket.removeAllListeners();
            existingSocket.disconnect();
            socketRef.current = null;
            setIsConnected(false);
        }

        if (!accessToken) {
            usePresenceStore.getState().clear();
            return;
        }

        const socket = io(resolveSocketUrl(), {
            transports: ['websocket'],
            withCredentials: true,
            auth: { token: accessToken },
            autoConnect: true
        });

        socket.on('connect', () => {
            setIsConnected(true);
            if (currentUserId) {
                usePresenceStore.getState().ensureOnline(currentUserId);
            }
            const joinedChannels = joinedChannelsRef.get(socket);
            if (joinedChannels) {
                joinedChannels.forEach(channelId => {
                    socket.emit('join_channel', { channelId });
                });
            }

            void (async () => {
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
            })();
        });

        socket.on('disconnect', reason => {
            console.info('Socket disconnected:', reason);
            setIsConnected(false);
        });

        socket.on('connect_error', error => {
            console.error('Socket connection error:', error);
        });

        socketRef.current = socket;

        return () => {
            socket.removeAllListeners();
            socket.disconnect();
            socketRef.current = null;
            setIsConnected(false);
        };
    }, [accessToken, currentUserId]);

    React.useEffect(() => {
        let isActive = true;

        if (!accessToken) {
            return () => {
                isActive = false;
            };
        }

        void (async () => {
            try {
                const snapshot = await presenceApi.fetchAll();
                if (!isActive || snapshot.length === 0) {
                    return;
                }

                const updates = snapshot.map(item => ({
                    userId: item.userId,
                    entry: presenceApi.toStateEntry(item)
                }));
                usePresenceStore.getState().setMany(updates);
            } catch (error) {
                console.warn('Failed to load presence snapshot:', error);
            }
        })();

        return () => {
            isActive = false;
        };
    }, [accessToken]);

    React.useEffect(() => {
        const socket = socketRef.current;
        if (!socket) {
            return;
        }

        const normalizeStatus = (value?: string): PresenceStatus => {
            const normalized = (value ?? '').toLowerCase();
            if (normalized === 'online' || normalized === 'away' || normalized === 'busy') {
                return normalized as PresenceStatus;
            }
            return 'offline';
        };

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
    }, [accessToken, isConnected]);

    const joinChannel = React.useCallback((channelId: string) => {
        if (!channelId) {
            return;
        }
        const socket = socketRef.current;
        if (!socket) {
            return;
        }
        if (!joinedChannelsRef.has(socket)) {
            joinedChannelsRef.set(socket, new Set<string>());
        }
        joinedChannelsRef.get(socket)!.add(channelId);
        if (socket.connected) {
            socket.emit('join_channel', { channelId });
        }
    }, []);

    const leaveChannel = React.useCallback((channelId: string) => {
        if (!channelId) {
            return;
        }
        const socket = socketRef.current;
        if (!socket) {
            return;
        }
        const joinedChannels = joinedChannelsRef.get(socket);
        if (joinedChannels) {
            joinedChannels.delete(channelId);
        }
        if (socket.connected) {
            socket.emit('leave_channel', { channelId });
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
