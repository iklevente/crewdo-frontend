import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '../ProtectedRoute';
import { PublicRoute } from '../PublicRoute';

interface MockAuthState {
    accessToken: string | null;
    isHydrated: boolean;
}

const mockAuthState: MockAuthState = {
    accessToken: null,
    isHydrated: true
};

jest.mock('store/auth-store', () => ({
    useAuthStore: (selector: (state: MockAuthState) => unknown) => selector(mockAuthState)
}));

const originalConsoleWarn = console.warn;
let consoleWarnSpy: jest.SpyInstance;

beforeAll(() => {
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation((message?: unknown, ...rest) => {
        if (typeof message === 'string' && message.includes('React Router Future Flag Warning')) {
            return;
        }

        originalConsoleWarn(message as Parameters<typeof console.warn>[0], ...rest);
    });
});

afterAll(() => {
    consoleWarnSpy.mockRestore();
});

describe('ProtectedRoute', () => {
    const renderProtected = (): void => {
        render(
            <MemoryRouter initialEntries={['/workspace']}>
                <Routes>
                    <Route path="/workspace" element={<ProtectedRoute redirectTo="/login" />}>
                        <Route index element={<div data-testid="protected-content">Secret</div>} />
                    </Route>
                    <Route path="/login" element={<div data-testid="login-page">Login</div>} />
                </Routes>
            </MemoryRouter>
        );
    };

    beforeEach(() => {
        mockAuthState.accessToken = null;
        mockAuthState.isHydrated = true;
    });

    it('shows loading splash while auth store hydrates', () => {
        mockAuthState.isHydrated = false;

        renderProtected();

        expect(screen.getByText('Preparing secure area...')).toBeInTheDocument();
    });

    it('redirects unauthenticated users to login route', async () => {
        renderProtected();

        expect(await screen.findByTestId('login-page')).toBeInTheDocument();
    });

    it('renders protected content when session exists', async () => {
        mockAuthState.accessToken = 'mock-token';

        renderProtected();

        expect(await screen.findByTestId('protected-content')).toBeInTheDocument();
    });
});

describe('PublicRoute', () => {
    const renderPublic = (): void => {
        render(
            <MemoryRouter initialEntries={['/login']}>
                <Routes>
                    <Route path="/login" element={<PublicRoute redirectTo="/app" />}>
                        <Route index element={<div data-testid="login-form">Login form</div>} />
                    </Route>
                    <Route path="/app" element={<div data-testid="app-shell">App</div>} />
                </Routes>
            </MemoryRouter>
        );
    };

    beforeEach(() => {
        mockAuthState.accessToken = null;
        mockAuthState.isHydrated = true;
    });

    it('shows loading splash while hydrating session', () => {
        mockAuthState.isHydrated = false;

        renderPublic();

        expect(screen.getByText('Preparing application...')).toBeInTheDocument();
    });

    it('renders public content when no session is present', async () => {
        renderPublic();

        expect(await screen.findByTestId('login-form')).toBeInTheDocument();
    });

    it('redirects authenticated users away from public routes', async () => {
        mockAuthState.accessToken = 'mock-token';

        renderPublic();

        expect(await screen.findByTestId('app-shell')).toBeInTheDocument();
    });
});
