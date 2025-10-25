import axios, { AxiosHeaders, AxiosInstance, AxiosResponse, isAxiosError } from 'axios';
import type { AxiosRequestHeaders, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from 'store/auth-store';
import {
    AuthenticationApi,
    AttachmentsApi,
    CallsApi,
    ChannelsApi,
    CommentsApi,
    MessagesApi,
    NotificationsApi,
    ProjectsApi,
    TasksApi,
    UsersApi,
    WorkspacesApi
} from '../api';
import { Configuration } from '../api/configuration';

interface CrewdoApiClients {
    readonly auth: AuthenticationApi;
    readonly attachments: AttachmentsApi;
    readonly calls: CallsApi;
    readonly channels: ChannelsApi;
    readonly comments: CommentsApi;
    readonly messages: MessagesApi;
    readonly notifications: NotificationsApi;
    readonly projects: ProjectsApi;
    readonly tasks: TasksApi;
    readonly users: UsersApi;
    readonly workspaces: WorkspacesApi;
}

const defaultBasePath = process.env.API_BASE_URL ?? '/api';

type RetriableAxiosRequestConfig = InternalAxiosRequestConfig & {
    __isRetryRequest?: boolean;
};

const axiosInstance: AxiosInstance = axios.create({
    baseURL: defaultBasePath,
    withCredentials: true
});

const refreshAxiosInstance: AxiosInstance = axios.create({
    baseURL: defaultBasePath,
    withCredentials: true
});

type RefreshHandler = (token?: string) => void;

let isRefreshing = false;
const refreshQueue: RefreshHandler[] = [];

const processRefreshQueue = (token?: string): void => {
    while (refreshQueue.length > 0) {
        const queued = refreshQueue.shift();
        if (queued) {
            queued(token);
        }
    }
};

const configuration = new Configuration({
    basePath: defaultBasePath,
    baseOptions: {
        withCredentials: true
    },
    accessToken: () => Promise.resolve(useAuthStore.getState().accessToken ?? '')
});

const publicConfiguration = new Configuration({
    basePath: defaultBasePath,
    baseOptions: {
        withCredentials: true
    }
});

const clients: CrewdoApiClients = {
    auth: new AuthenticationApi(configuration, configuration.basePath, axiosInstance),
    attachments: new AttachmentsApi(configuration, configuration.basePath, axiosInstance),
    calls: new CallsApi(configuration, configuration.basePath, axiosInstance),
    channels: new ChannelsApi(configuration, configuration.basePath, axiosInstance),
    comments: new CommentsApi(configuration, configuration.basePath, axiosInstance),
    messages: new MessagesApi(configuration, configuration.basePath, axiosInstance),
    notifications: new NotificationsApi(configuration, configuration.basePath, axiosInstance),
    projects: new ProjectsApi(configuration, configuration.basePath, axiosInstance),
    tasks: new TasksApi(configuration, configuration.basePath, axiosInstance),
    users: new UsersApi(configuration, configuration.basePath, axiosInstance),
    workspaces: new WorkspacesApi(configuration, configuration.basePath, axiosInstance)
};

const authClientForRefresh = new AuthenticationApi(
    publicConfiguration,
    publicConfiguration.basePath,
    refreshAxiosInstance
);

const setAuthorizationHeader = (config: RetriableAxiosRequestConfig, token: string): void => {
    if (config.headers instanceof AxiosHeaders) {
        config.headers.set('Authorization', `Bearer ${token}`);
        return;
    }

    const headers = (config.headers ?? {}) as Record<string, string>;
    headers.Authorization = `Bearer ${token}`;
    config.headers = headers as unknown as AxiosRequestHeaders;
};

axiosInstance.interceptors.request.use(config => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
        setAuthorizationHeader(config as RetriableAxiosRequestConfig, token);
    }
    return config;
});

axiosInstance.interceptors.response.use(
    response => response,
    async caughtError => {
        if (!isAxiosError(caughtError)) {
            return Promise.reject(
                caughtError instanceof Error ? caughtError : new Error('Unknown HTTP error')
            );
        }

        const originalRequest = caughtError.config as RetriableAxiosRequestConfig | undefined;
        const status = caughtError.response?.status;

        if (!originalRequest || status !== 401 || originalRequest.__isRetryRequest) {
            return Promise.reject(caughtError);
        }

        const { refreshToken } = useAuthStore.getState();
        if (!refreshToken) {
            useAuthStore.getState().clearAuth();
            return Promise.reject(caughtError);
        }

        if (isRefreshing) {
            return new Promise((resolve, reject) => {
                refreshQueue.push(token => {
                    if (!token) {
                        reject(caughtError);
                        return;
                    }

                    setAuthorizationHeader(originalRequest, token);
                    originalRequest.__isRetryRequest = true;
                    resolve(axiosInstance(originalRequest));
                });
            });
        }

        originalRequest.__isRetryRequest = true;
        isRefreshing = true;

        try {
            const refreshResponse = (await authClientForRefresh.authControllerRefresh({
                refresh_token: refreshToken
            })) as unknown as AxiosResponse<{ access_token: string }>;

            const newAccessToken = refreshResponse.data.access_token;
            useAuthStore.getState().setTokens(newAccessToken, refreshToken);
            processRefreshQueue(newAccessToken);

            setAuthorizationHeader(originalRequest, newAccessToken);

            return axiosInstance(originalRequest);
        } catch (refreshError) {
            processRefreshQueue();
            useAuthStore.getState().clearAuth();

            const errorToThrow =
                refreshError instanceof Error
                    ? refreshError
                    : new Error('Failed to refresh authentication token');
            return Promise.reject(errorToThrow);
        } finally {
            isRefreshing = false;
        }
    }
);

export const apiClients = clients;
export { axiosInstance };
