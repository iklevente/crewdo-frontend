import type { AxiosResponse } from 'axios';
import { apiClients } from 'services/api-clients';
import type { LoginDto } from 'api/models/login-dto';
import type { RegisterDto } from 'api/models/register-dto';
import type { AuthResponseDto } from 'api/models/auth-response-dto';
import type { AuthSession, AuthUser } from '../types';

const mapAuthUser = (user: unknown): AuthUser => {
    if (typeof user !== 'object' || user === null) {
        throw new Error('Invalid user payload received from authentication response');
    }

    const payload = user as Record<string, unknown>;

    const workspaceIdValue = payload.workspaceId;

    const ensureId = (value: unknown): string => {
        if (typeof value === 'string') {
            return value;
        }

        if (typeof value === 'number') {
            return value.toString();
        }

        return '';
    };

    const ensureString = (value: unknown): string => {
        return typeof value === 'string' ? value : '';
    };

    return {
        id: ensureId(payload.id),
        email: ensureString(payload.email),
        firstName: ensureString(payload.firstName),
        lastName: ensureString(payload.lastName),
        role: ensureString(payload.role),
        workspaceId:
            typeof workspaceIdValue === 'number' || typeof workspaceIdValue === 'string'
                ? workspaceIdValue
                : null
    };
};

const mapAuthResponse = (response: AuthResponseDto): AuthSession => {
    return {
        accessToken: response.access_token,
        refreshToken: response.refresh_token,
        user: mapAuthUser(response.user)
    };
};

export const login = async (credentials: LoginDto): Promise<AuthSession> => {
    const response: AxiosResponse<AuthResponseDto> =
        await apiClients.auth.authControllerLogin(credentials);
    return mapAuthResponse(response.data);
};

export const register = async (payload: RegisterDto): Promise<AuthSession> => {
    const response: AxiosResponse<AuthResponseDto> =
        await apiClients.auth.authControllerRegister(payload);
    return mapAuthResponse(response.data);
};
