import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { LoginPage } from '../../pages/LoginPage';
import { PublicRoute } from '../../../../app/routes/PublicRoute';
import { useAuthStore } from '../../../../store/auth-store';
import type { LoginDto } from '../../../../api/models/login-dto';

jest.mock('../../hooks/useAuthMutations', () => ({
    useLoginMutation: jest.fn()
}));

describe('LoginForm', () => {
    const originalConsoleWarn = console.warn;
    const mockedUseLoginMutation = jest.requireMock('../../hooks/useAuthMutations')
        .useLoginMutation as jest.Mock;
    let consoleWarnSpy: jest.SpyInstance;

    const renderLoginFlow = (): ReturnType<typeof render> =>
        render(
            <MemoryRouter initialEntries={['/login']}>
                <Routes>
                    <Route element={<PublicRoute />}>
                        <Route path="/login" element={<LoginPage />} />
                    </Route>
                    <Route path="/app" element={<div data-testid="app-home">App Home</div>} />
                </Routes>
            </MemoryRouter>
        );

    const resetAuthStore = (): void => {
        useAuthStore.setState({
            accessToken: null,
            refreshToken: null,
            user: null,
            isHydrated: true
        });
    };

    beforeEach(() => {
        resetAuthStore();
        mockedUseLoginMutation.mockReset();
        consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation((message?: unknown, ...rest: unknown[]) => {
            if (typeof message === 'string' && message.includes('React Router Future Flag Warning')) {
                return;
            }
            originalConsoleWarn(message as never, ...rest);
        });
    });

    afterEach(() => {
        resetAuthStore();
        consoleWarnSpy?.mockRestore();
    });

    it('submits credentials and redirects to the app on success', async () => {
        const mutate = jest.fn((values: LoginDto) => {
            act(() => {
                useAuthStore.setState({
                    accessToken: 'token',
                    refreshToken: 'refresh',
                    user: {
                        id: 'user-1',
                        email: values.email,
                        firstName: 'Tester',
                        lastName: 'User',
                        role: 'MEMBER',
                        workspaceId: 1
                    }
                });
            });
        });

        mockedUseLoginMutation.mockReturnValue({
            mutate,
            isPending: false
        });

        renderLoginFlow();

        const user = userEvent.setup();

        await user.type(screen.getByLabelText(/email/i), 'user@example.com');
        await user.type(screen.getByLabelText(/password/i), 'SuperSecret1!');
        await user.click(screen.getByRole('button', { name: /sign in/i }));

        await waitFor(() => expect(mutate).toHaveBeenCalledWith({
            email: 'user@example.com',
            password: 'SuperSecret1!'
        }));

        await waitFor(() => {
            expect(screen.getByTestId('app-home')).toBeInTheDocument();
        });
    });
});
