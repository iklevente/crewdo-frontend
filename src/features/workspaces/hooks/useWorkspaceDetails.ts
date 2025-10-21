import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { apiClients } from 'services/api-clients';
import {
    usePresenceStore,
    type PresenceStateEntry,
    type PresenceStatus
} from 'store/presence-store';
import type {
    Workspace,
    WorkspaceChannelSummary,
    WorkspaceMember,
    WorkspaceMembersResponse
} from '../types/workspace';

export const WORKSPACE_DETAIL_QUERY_KEY = (workspaceId: string): [string, string] => [
    'workspace',
    workspaceId
];
export const WORKSPACE_MEMBERS_QUERY_KEY = (workspaceId: string): [string, string] => [
    'workspace-members',
    workspaceId
];

interface UseWorkspaceDetailsResult {
    readonly workspace: Workspace | undefined;
    readonly members: WorkspaceMember[];
    readonly owner: WorkspaceMember | null;
    readonly channels: WorkspaceChannelSummary[];
    readonly isWorkspaceLoading: boolean;
    readonly isWorkspaceError: boolean;
    readonly isMembersLoading: boolean;
    readonly isMembersError: boolean;
}

export const useWorkspaceDetails = (workspaceId: string | null): UseWorkspaceDetailsResult => {
    const {
        data: workspace,
        isLoading: isWorkspaceLoading,
        isError: isWorkspaceError
    } = useQuery<Workspace>({
        queryKey: WORKSPACE_DETAIL_QUERY_KEY(workspaceId ?? ''),
        queryFn: async () => {
            if (!workspaceId) {
                throw new Error('Workspace ID is required');
            }
            const response = await apiClients.workspaces.workspaceControllerFindOne(workspaceId);
            return response.data as unknown as Workspace;
        },
        enabled: Boolean(workspaceId),
        refetchInterval: 10000,
        refetchIntervalInBackground: true
    });

    const {
        data: membersPayload,
        isLoading: isMembersLoading,
        isError: isMembersError
    } = useQuery<WorkspaceMembersResponse>({
        queryKey: WORKSPACE_MEMBERS_QUERY_KEY(workspaceId ?? ''),
        queryFn: async () => {
            if (!workspaceId) {
                throw new Error('Workspace ID is required');
            }
            const response = await apiClients.workspaces.workspaceControllerGetMembers(workspaceId);
            return response.data as unknown as WorkspaceMembersResponse;
        },
        enabled: Boolean(workspaceId),
        refetchInterval: 10000,
        refetchIntervalInBackground: true
    });

    React.useEffect(() => {
        if (!membersPayload) {
            return;
        }

        const mapPresence = (
            presence: WorkspaceMember['presence'] | undefined
        ): PresenceStateEntry | null => {
            if (!presence) {
                return null;
            }
            const normalizeStatus = (status?: string): PresenceStatus => {
                const normalized = (status ?? 'offline').toLowerCase();
                if (normalized === 'online' || normalized === 'away' || normalized === 'busy') {
                    return normalized as PresenceStatus;
                }
                return 'offline';
            };

            return {
                status: normalizeStatus(presence.status),
                customStatus: presence.customStatus ?? null,
                statusSource: presence.statusSource ?? 'auto',
                manualStatus: presence.manualStatus ? normalizeStatus(presence.manualStatus) : null,
                manualCustomStatus: presence.manualCustomStatus ?? null,
                lastSeenAt: presence.lastSeenAt ?? null,
                timestamp: presence.timestamp
            };
        };

        const updates: { userId: string; entry: PresenceStateEntry }[] = [];

        const collect = (member: WorkspaceMember | undefined): void => {
            if (!member?.id) {
                return;
            }
            const entry = mapPresence(member.presence);
            if (entry) {
                updates.push({ userId: member.id, entry });
            }
        };

        collect(membersPayload.owner);
        membersPayload.members.forEach(collect);

        if (updates.length > 0) {
            usePresenceStore.getState().setMany(updates);
        }
    }, [membersPayload]);

    const presenceEntries = usePresenceStore(state => state.entries);

    const members: WorkspaceMember[] = React.useMemo(() => {
        if (!membersPayload) {
            return [];
        }

        const allMembers = [membersPayload.owner, ...membersPayload.members];

        return allMembers.map(member => ({
            ...member,
            presence:
                member.id && presenceEntries[member.id]
                    ? presenceEntries[member.id]
                    : member.presence
        }));
    }, [membersPayload, presenceEntries]);

    const ownerWithPresence = React.useMemo(() => {
        if (!membersPayload?.owner) {
            return null;
        }
        return (
            members.find(member => member.id === membersPayload.owner.id) ?? {
                ...membersPayload.owner,
                presence:
                    membersPayload.owner.id && presenceEntries[membersPayload.owner.id]
                        ? presenceEntries[membersPayload.owner.id]
                        : membersPayload.owner.presence
            }
        );
    }, [members, membersPayload, presenceEntries]);

    const channels: WorkspaceChannelSummary[] = React.useMemo(() => {
        if (!workspace?.channels) {
            return [];
        }
        return workspace.channels;
    }, [workspace]);

    return {
        workspace,
        members,
        owner: ownerWithPresence,
        channels,
        isWorkspaceLoading,
        isWorkspaceError,
        isMembersLoading,
        isMembersError
    };
};
