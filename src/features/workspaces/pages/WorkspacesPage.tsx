import React from 'react';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Stack,
    Typography
} from '@mui/material';
import toast from 'react-hot-toast';
import { useAppNavigate } from 'appHistory';
import { useAuthStore } from 'store/auth-store';
import { useWorkspaceSelectionStore } from 'store/workspace-selection-store';
import {
    ChannelFormDialog,
    type ChannelFormValues
} from 'features/channels/components/ChannelFormDialog';
import { ChannelManagerDialog } from 'features/channels/components/ChannelManagerDialog';
import { useChannelManagement } from 'features/channels/hooks/useChannelManagement';
import {
    CreateChannelDtoTypeEnum,
    CreateChannelDtoVisibilityEnum
} from 'api/models/create-channel-dto';
import { UpdateChannelDtoVisibilityEnum } from 'api/models/update-channel-dto';
import { CreateWorkspaceDtoTypeEnum } from 'api/models/create-workspace-dto';
import { UpdateWorkspaceDtoTypeEnum } from 'api/models/update-workspace-dto';
import { WorkspaceFormDialog, type WorkspaceFormValues } from '../components/WorkspaceFormDialog';
import { WorkspaceSwitcher } from '../components/WorkspaceSwitcher';
import { WorkspaceOverview } from '../components/WorkspaceOverview';
import { WorkspaceMembersPanel } from '../components/WorkspaceMembersPanel';
import { useWorkspaces } from '../hooks/useWorkspaces';
import { useWorkspaceDetails } from '../hooks/useWorkspaceDetails';
import { useWorkspaceChannelSubscriptions } from '../hooks/useWorkspaceChannelSubscriptions';

export const WorkspacesPage: React.FC = () => {
    const navigate = useAppNavigate();
    const user = useAuthStore(state => state.user);

    const {
        workspaces,
        isLoading,
        isError,
        createWorkspace,
        updateWorkspace,
        deleteWorkspace,
        addWorkspaceMember,
        removeWorkspaceMember
    } = useWorkspaces();

    const selectedWorkspaceId = useWorkspaceSelectionStore(state => state.selectedWorkspaceId);
    const setSelectedWorkspaceId = useWorkspaceSelectionStore(
        state => state.setSelectedWorkspaceId
    );
    const clearWorkspaceSelection = useWorkspaceSelectionStore(state => state.clearSelection);
    const isWorkspaceSelectionHydrated = useWorkspaceSelectionStore(state => state.isHydrated);
    const [isCreateDialogOpen, setCreateDialogOpen] = React.useState(false);
    const [isEditDialogOpen, setEditDialogOpen] = React.useState(false);
    const [workspaceToDeleteId, setWorkspaceToDeleteId] = React.useState<string | null>(null);
    const [isCreateChannelOpen, setCreateChannelOpen] = React.useState(false);
    const [channelManagerId, setChannelManagerId] = React.useState<string | null>(null);
    const [isSubmittingWorkspace, setSubmittingWorkspace] = React.useState(false);

    React.useEffect(() => {
        if (!isWorkspaceSelectionHydrated) {
            return;
        }

        if (workspaces.length === 0) {
            if (selectedWorkspaceId !== null) {
                clearWorkspaceSelection();
            }
            return;
        }

        const exists = selectedWorkspaceId
            ? workspaces.some(workspace => workspace.id === selectedWorkspaceId)
            : false;

        if (!selectedWorkspaceId || !exists) {
            setSelectedWorkspaceId(workspaces[0].id);
        }
    }, [
        clearWorkspaceSelection,
        isWorkspaceSelectionHydrated,
        selectedWorkspaceId,
        setSelectedWorkspaceId,
        workspaces
    ]);

    const selectedWorkspace = React.useMemo(() => {
        if (!selectedWorkspaceId) {
            return null;
        }
        return workspaces.find(workspace => workspace.id === selectedWorkspaceId) ?? null;
    }, [workspaces, selectedWorkspaceId]);

    const {
        workspace: workspaceDetails,
        members,
        owner,
        channels,
        isWorkspaceLoading,
        isWorkspaceError,
        isMembersLoading,
        isMembersError
    } = useWorkspaceDetails(selectedWorkspaceId);

    const currentWorkspace = workspaceDetails ?? selectedWorkspace ?? null;
    const currentWorkspaceId = currentWorkspace?.id ?? null;
    const currentUserId = user?.id ?? null;
    const isAdmin = (user?.role ?? '').toLowerCase() === 'admin';
    const canManageWorkspace = Boolean(
        currentWorkspace && (isAdmin || currentWorkspace.owner?.id === currentUserId)
    );
    const canManageChannels = canManageWorkspace;
    const canInviteMembers = canManageWorkspace;
    const canRemoveMembers = canManageWorkspace;
    const canCreateWorkspace = isAdmin;

    const {
        createChannel: createChannelMutation,
        updateChannel: updateChannelMutation,
        deleteChannel: deleteChannelMutation,
        addMember: addChannelMember,
        removeMember: removeChannelMember,
        isBusy: isChannelBusy
    } = useChannelManagement(currentWorkspaceId);

    const combinedBusyState = isSubmittingWorkspace || isChannelBusy;

    const subscriptionChannelIds = React.useMemo(() => {
        if (!currentWorkspaceId) {
            return [] as string[];
        }
        return channels.map(channel => channel.id);
    }, [channels, currentWorkspaceId]);

    useWorkspaceChannelSubscriptions(subscriptionChannelIds);

    const workspaceInitialValues = React.useMemo<WorkspaceFormValues | undefined>(() => {
        if (!currentWorkspace) {
            return undefined;
        }
        return {
            name: currentWorkspace.name ?? '',
            description: currentWorkspace.description ?? '',
            type:
                (currentWorkspace.type as CreateWorkspaceDtoTypeEnum) ??
                CreateWorkspaceDtoTypeEnum.Team
        };
    }, [currentWorkspace]);

    const handleCreate = async (payload: WorkspaceFormValues): Promise<void> => {
        setSubmittingWorkspace(true);
        try {
            await createWorkspace({
                name: payload.name,
                description: payload.description,
                type: payload.type
            });
            setCreateDialogOpen(false);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to create workspace';
            toast.error(message);
            throw error;
        } finally {
            setSubmittingWorkspace(false);
        }
    };

    const handleUpdate = async (payload: WorkspaceFormValues): Promise<void> => {
        if (!currentWorkspaceId) {
            toast.error('Select a workspace before editing');
            throw new Error('Workspace not selected');
        }

        setSubmittingWorkspace(true);
        try {
            await updateWorkspace(currentWorkspaceId, {
                name: payload.name,
                description: payload.description,
                type: payload.type as UpdateWorkspaceDtoTypeEnum
            });
            setEditDialogOpen(false);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to update workspace';
            toast.error(message);
            throw error;
        } finally {
            setSubmittingWorkspace(false);
        }
    };

    const handleDelete = async (): Promise<void> => {
        if (!workspaceToDeleteId) {
            return;
        }

        setSubmittingWorkspace(true);
        try {
            await deleteWorkspace(workspaceToDeleteId);
            if (selectedWorkspaceId === workspaceToDeleteId) {
                clearWorkspaceSelection();
            }
            setWorkspaceToDeleteId(null);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to delete workspace';
            toast.error(message);
        } finally {
            setSubmittingWorkspace(false);
        }
    };

    const handleAddMember = async (email: string): Promise<void> => {
        if (!currentWorkspaceId) {
            toast.error('Select a workspace before inviting members');
            throw new Error('Workspace not selected');
        }

        setSubmittingWorkspace(true);
        try {
            await addWorkspaceMember(currentWorkspaceId, email);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to add member';
            toast.error(message);
            throw error;
        } finally {
            setSubmittingWorkspace(false);
        }
    };

    const handleRemoveMember = async (memberId: string): Promise<void> => {
        if (!currentWorkspaceId) {
            toast.error('Select a workspace before removing members');
            throw new Error('Workspace not selected');
        }

        setSubmittingWorkspace(true);
        try {
            await removeWorkspaceMember(currentWorkspaceId, memberId);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to remove member';
            toast.error(message);
            throw error;
        } finally {
            setSubmittingWorkspace(false);
        }
    };

    const handleOpenChannel = (channelId: string): void => {
        if (!currentWorkspaceId) {
            toast.error('Select a workspace before opening channels');
            return;
        }
        navigate(`/app/workspaces/${currentWorkspaceId}/channels/${channelId}`);
    };

    const handleCreateChannel = async (values: ChannelFormValues): Promise<void> => {
        if (!currentWorkspaceId) {
            toast.error('Select a workspace before creating channels');
            throw new Error('Workspace not selected');
        }

        await createChannelMutation({
            name: values.name,
            description: values.description,
            topic: values.topic,
            type: CreateChannelDtoTypeEnum.Text,
            visibility: values.visibility as CreateChannelDtoVisibilityEnum,
            workspaceId: currentWorkspaceId
        });
        setCreateChannelOpen(false);
    };

    const handleUpdateChannel = async (
        channelId: string,
        values: ChannelFormValues
    ): Promise<void> => {
        await updateChannelMutation(channelId, {
            name: values.name,
            description: values.description,
            topic: values.topic,
            visibility: values.visibility as UpdateChannelDtoVisibilityEnum
        });
    };

    const handleDeleteChannel = async (channelId: string): Promise<void> => {
        await deleteChannelMutation(channelId);
    };

    const handleAddChannelMember = async (channelId: string, userId: string): Promise<void> => {
        await addChannelMember(channelId, userId);
    };

    const handleRemoveChannelMember = async (channelId: string, userId: string): Promise<void> => {
        await removeChannelMember(channelId, userId);
    };

    return (
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 3 }}>
            <WorkspaceSwitcher
                workspaces={workspaces}
                selectedWorkspaceId={selectedWorkspaceId}
                onSelect={workspace => setSelectedWorkspaceId(workspace.id)}
                onCreateWorkspace={() => setCreateDialogOpen(true)}
                canCreateWorkspace={canCreateWorkspace}
                isLoading={isLoading}
            />

            <Box
                sx={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: { xs: 'column', lg: 'row' },
                    gap: 3,
                    alignItems: 'stretch'
                }}
            >
                {isError || isWorkspaceError ? (
                    <Stack
                        spacing={2}
                        alignItems="center"
                        justifyContent="center"
                        sx={{ flex: 1, minHeight: '60vh' }}
                    >
                        <Typography variant="h6">Failed to load workspaces</Typography>
                        <Typography variant="body2" color="text.secondary" align="center">
                            Please refresh the page or try again later.
                        </Typography>
                        {canCreateWorkspace ? (
                            <Button variant="outlined" onClick={() => setCreateDialogOpen(true)}>
                                Create workspace
                            </Button>
                        ) : null}
                    </Stack>
                ) : (
                    <WorkspaceOverview
                        workspace={currentWorkspace}
                        channels={channels}
                        isWorkspaceLoading={isWorkspaceLoading}
                        isChannelsLoading={isWorkspaceLoading}
                        canEditWorkspace={canManageWorkspace}
                        canManageChannels={canManageChannels}
                        onEditWorkspace={() => setEditDialogOpen(true)}
                        onDeleteWorkspace={() => {
                            if (currentWorkspaceId) {
                                setWorkspaceToDeleteId(currentWorkspaceId);
                            }
                        }}
                        onCreateChannel={() => setCreateChannelOpen(true)}
                        onManageChannel={channelId => setChannelManagerId(channelId)}
                        onOpenChannel={handleOpenChannel}
                        isBusy={combinedBusyState}
                    />
                )}

                {isMembersError ? (
                    <Box
                        sx={{
                            width: { xs: '100%', lg: 320 },
                            position: { lg: 'sticky' },
                            top: { lg: theme => theme.spacing(6) },
                            alignSelf: 'flex-start',
                            borderRadius: 3,
                            border: theme => `1px solid ${theme.palette.divider}`,
                            backgroundColor: theme => theme.palette.background.paper,
                            p: 2,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minHeight: 200
                        }}
                    >
                        <Typography variant="body2" color="text.secondary" align="center">
                            Failed to load members. Please try again later.
                        </Typography>
                    </Box>
                ) : (
                    <WorkspaceMembersPanel
                        members={members}
                        owner={owner}
                        canInviteMembers={canInviteMembers}
                        canRemoveMembers={canRemoveMembers}
                        onInviteMember={handleAddMember}
                        onRemoveMember={handleRemoveMember}
                        isBusy={combinedBusyState || isMembersLoading}
                    />
                )}
            </Box>

            <WorkspaceFormDialog
                open={isCreateDialogOpen}
                onClose={() => setCreateDialogOpen(false)}
                title="Create workspace"
                submitLabel="Create"
                onSubmit={handleCreate}
                isSubmitting={isSubmittingWorkspace}
            />

            <WorkspaceFormDialog
                open={isEditDialogOpen}
                onClose={() => setEditDialogOpen(false)}
                title="Edit workspace"
                submitLabel="Save changes"
                onSubmit={handleUpdate}
                initialValues={workspaceInitialValues}
                isSubmitting={isSubmittingWorkspace}
            />

            <ChannelFormDialog
                open={isCreateChannelOpen}
                title="Create channel"
                submitLabel="Create"
                onClose={() => setCreateChannelOpen(false)}
                onSubmit={handleCreateChannel}
                isSubmitting={isChannelBusy}
            />

            <ChannelManagerDialog
                channelId={channelManagerId}
                open={Boolean(channelManagerId)}
                workspaceMembers={members}
                canManageChannels={canManageChannels}
                currentUserId={currentUserId}
                onClose={() => setChannelManagerId(null)}
                onUpdateChannel={handleUpdateChannel}
                onDeleteChannel={handleDeleteChannel}
                onAddMember={handleAddChannelMember}
                onRemoveMember={handleRemoveChannelMember}
                isBusy={isChannelBusy}
            />

            <Dialog
                open={Boolean(workspaceToDeleteId)}
                onClose={() => setWorkspaceToDeleteId(null)}
            >
                <DialogTitle>Delete workspace</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to delete this workspace? This action cannot be
                        undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setWorkspaceToDeleteId(null)}>Cancel</Button>
                    <Button
                        color="error"
                        onClick={() => {
                            void handleDelete();
                        }}
                        disabled={isSubmittingWorkspace}
                    >
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};
