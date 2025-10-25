import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { LoginPage } from 'features/auth/pages/LoginPage';
import { RegisterPage } from 'features/auth/pages/RegisterPage';
import { OverviewPage } from 'features/dashboard/pages/OverviewPage';
import { DashboardPlaceholder } from 'features/dashboard/pages/DashboardPlaceholder';
import { WorkspacesPage } from 'features/workspaces/pages/WorkspacesPage';
import { ChannelPage } from 'features/channels/pages/ChannelPage';
import { ConversationsPage } from 'features/conversations/pages/ConversationsPage';
import { ProjectsPage } from 'features/projects/pages/ProjectsPage';
import { CallsPage } from 'features/calls/pages/CallsPage';
import { NotificationsPage } from 'features/notifications/pages/NotificationsPage';
import { MainLayout } from '../layout/MainLayout';
import { AppProviders } from '../providers/AppProviders';
import { AuthBootstrap } from '../providers/AuthBootstrap';
import { PublicRoute } from './PublicRoute';
import { ProtectedRoute } from './ProtectedRoute';

export const AppRoutes: React.FC = () => {
    return (
        <AppProviders>
            <AuthBootstrap>
                <BrowserRouter>
                    <Routes>
                        <Route element={<PublicRoute />}>
                            <Route path="/login" element={<LoginPage />} />
                            <Route path="/register" element={<RegisterPage />} />
                        </Route>

                        <Route element={<ProtectedRoute />}>
                            <Route path="/" element={<Navigate to="/app" replace />} />
                            <Route path="/app" element={<MainLayout />}>
                                <Route index element={<OverviewPage />} />
                                <Route path="workspaces" element={<WorkspacesPage />} />
                                <Route path="conversations" element={<ConversationsPage />} />
                                <Route path="conversations/:channelId" element={<ChannelPage />} />
                                <Route
                                    path="workspaces/:workspaceId/channels/:channelId"
                                    element={<ChannelPage />}
                                />
                                <Route path="projects" element={<ProjectsPage />} />
                                <Route path="calls" element={<CallsPage />} />
                                <Route path="notifications" element={<NotificationsPage />} />
                                <Route
                                    path="users"
                                    element={
                                        <DashboardPlaceholder
                                            title="Users"
                                            description="Manage team access, roles, and invitations."
                                        />
                                    }
                                />
                                <Route
                                    path="settings"
                                    element={
                                        <DashboardPlaceholder
                                            title="Settings"
                                            description="Configure organization preferences, integrations, and more."
                                        />
                                    }
                                />
                            </Route>
                        </Route>

                        <Route path="*" element={<Navigate to="/app" replace />} />
                    </Routes>
                </BrowserRouter>
            </AuthBootstrap>
        </AppProviders>
    );
};
