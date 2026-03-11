import axios, {
  AxiosError,
  InternalAxiosRequestConfig,
} from "axios";
import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  User,
  Company,
  Job,
  JobsListResponse,
  KanbanStage,
  Task,
  CreateTaskRequest,
  CompleteTaskRequest,
  FilterRule,
  ActivityLogEntry,
  Settings,
  UpdateProfileRequest,
  ChangePasswordRequest,
} from "@/types";

// ─── Token Storage (in-memory only — never persisted to localStorage) ────────

let accessToken: string | null = null;
let csrfToken: string | null = null;

export function setAccessToken(token: string) {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function setCsrfToken(token: string) {
  csrfToken = token;
}

export function getCsrfToken(): string | null {
  return csrfToken;
}

export function clearTokens() {
  accessToken = null;
  csrfToken = null;
}

// ─── Axios Instance ──────────────────────────────────────────────────────────

const api = axios.create({
  baseURL: "",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// ─── Request Interceptor ─────────────────────────────────────────────────────

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  if (csrfToken) {
    config.headers["X-CSRF-Token"] = csrfToken;
  }
  return config;
});

// ─── Response Interceptor (401 refresh logic) ────────────────────────────────

const AUTH_ENDPOINTS = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/refresh",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
];

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string | null) => void;
  reject: (error: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Skip auth endpoints
    const isAuthEndpoint = AUTH_ENDPOINTS.some((endpoint) =>
      originalRequest?.url?.includes(endpoint),
    );

    if (
      error.response?.status === 401 &&
      !isAuthEndpoint &&
      !originalRequest._retry
    ) {
      if (isRefreshing) {
        // Queue this request until the refresh completes
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string | null) => {
              if (token) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              resolve(api(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const newTokens = await refreshToken();
        setAccessToken(newTokens.access_token);
        setCsrfToken(newTokens.csrf_token);
        processQueue(null, newTokens.access_token);
        originalRequest.headers.Authorization = `Bearer ${newTokens.access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearTokens();
        // Redirect to login if on client side
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

// ─── Auth API ────────────────────────────────────────────────────────────────

export async function login(data: LoginRequest): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>("/api/auth/login", data);
  return response.data;
}

export async function register(data: RegisterRequest): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>("/api/auth/register", data);
  return response.data;
}

export async function logout(): Promise<void> {
  await api.post("/api/auth/logout");
  clearTokens();
}

export async function refreshToken(): Promise<AuthResponse> {
  // Refresh token is sent automatically via httpOnly cookie
  const response = await api.post<AuthResponse>("/api/auth/refresh");
  return response.data;
}

export async function forgotPassword(
  data: ForgotPasswordRequest,
): Promise<void> {
  await api.post("/api/auth/forgot-password", data);
}

export async function resetPassword(
  data: ResetPasswordRequest,
): Promise<void> {
  await api.post("/api/auth/reset-password", data);
}

export async function verifyEmail(token: string): Promise<void> {
  await api.get("/api/auth/verify-email", { params: { token } });
}

export async function getMe(): Promise<User> {
  const response = await api.get<User>("/api/auth/me");
  return response.data;
}

// ─── Companies API ───────────────────────────────────────────────────────────

export async function getCompanies(
  params?: Record<string, unknown>,
): Promise<Company[]> {
  const response = await api.get<Company[]>("/api/companies", { params });
  return response.data;
}

export async function createCompany(
  data: Partial<Company>,
): Promise<Company> {
  const response = await api.post<Company>("/api/companies", data);
  return response.data;
}

export async function updateCompany(
  id: number,
  data: Partial<Company>,
): Promise<Company> {
  const response = await api.patch<Company>(`/api/companies/${id}`, data);
  return response.data;
}

export async function deleteCompany(id: number): Promise<void> {
  await api.delete(`/api/companies/${id}`);
}

// ─── Jobs API ────────────────────────────────────────────────────────────────

export async function getJobs(
  params?: Record<string, unknown>,
): Promise<JobsListResponse> {
  const response = await api.get<JobsListResponse>("/api/jobs", { params });
  return response.data;
}

export async function createJob(data: Partial<Job>): Promise<Job> {
  const response = await api.post<Job>("/api/jobs", data);
  return response.data;
}

export async function updateJob(
  id: number,
  data: Partial<Job>,
): Promise<Job> {
  const response = await api.patch<Job>(`/api/jobs/${id}`, data);
  return response.data;
}

export async function deleteJob(id: number): Promise<void> {
  await api.delete(`/api/jobs/${id}`);
}

export async function checkJobUrl(
  companyId: number,
  url: string,
): Promise<{ exists: boolean }> {
  const response = await api.post<{ exists: boolean }>("/api/jobs/check-url", {
    company_id: companyId,
    url,
  });
  return response.data;
}

export async function reorderJobs(
  data: { id: number; kanban_stage_id: number; kanban_order: number }[],
): Promise<void> {
  await api.patch("/api/jobs/reorder", { items: data });
}

// ─── Tasks API ───────────────────────────────────────────────────────────────

export async function getTasks(
  params?: Record<string, unknown>,
): Promise<Task[]> {
  const response = await api.get<Task[]>("/api/tasks", { params });
  return response.data;
}

export async function createTask(data: CreateTaskRequest): Promise<Task> {
  const response = await api.post<Task>("/api/tasks", data);
  return response.data;
}

export async function completeTask(
  id: number,
  data?: CompleteTaskRequest,
): Promise<Task> {
  const response = await api.post<Task>(`/api/tasks/${id}/complete`, data);
  return response.data;
}

export async function failTask(
  id: number,
  data?: { notes?: string },
): Promise<Task> {
  const response = await api.post<Task>(`/api/tasks/${id}/fail`, data);
  return response.data;
}

export async function deleteTask(id: number): Promise<void> {
  await api.delete(`/api/tasks/${id}`);
}

export async function reorderTasks(
  data: { id: number; queue_order: number }[],
): Promise<void> {
  await api.patch("/api/tasks/reorder", { items: data });
}

export async function bulkMoveTasks(data: {
  task_ids: number[];
  target_queue: string;
}): Promise<void> {
  await api.patch("/api/tasks/bulk-move", data);
}

export async function autoFillToday(): Promise<Task[]> {
  const response = await api.post<Task[]>("/api/tasks/auto-fill-today");
  return response.data;
}

// ─── Filters API ─────────────────────────────────────────────────────────────

export async function getFilters(
  params?: Record<string, unknown>,
): Promise<FilterRule[]> {
  const response = await api.get<FilterRule[]>("/api/filters", { params });
  return response.data;
}

export async function createFilter(
  data: Partial<FilterRule>,
): Promise<FilterRule> {
  const response = await api.post<FilterRule>("/api/filters", data);
  return response.data;
}

export async function updateFilter(
  id: number,
  data: Partial<FilterRule>,
): Promise<FilterRule> {
  const response = await api.patch<FilterRule>(`/api/filters/${id}`, data);
  return response.data;
}

export async function deleteFilter(id: number): Promise<void> {
  await api.delete(`/api/filters/${id}`);
}

export async function getFilterPrompt(companyId: number | string): Promise<string> {
  const response = await api.get<{ prompt: string }>(
    `/api/filters/prompt/${companyId}`,
  );
  return response.data.prompt;
}

// ─── Kanban Stages API ──────────────────────────────────────────────────────

export async function getKanbanStages(): Promise<KanbanStage[]> {
  const response = await api.get<KanbanStage[]>("/api/kanban-stages");
  return response.data;
}

export async function createKanbanStage(
  data: Partial<KanbanStage>,
): Promise<KanbanStage> {
  const response = await api.post<KanbanStage>("/api/kanban-stages", data);
  return response.data;
}

export async function updateKanbanStage(
  id: number,
  data: Partial<KanbanStage>,
): Promise<KanbanStage> {
  const response = await api.patch<KanbanStage>(
    `/api/kanban-stages/${id}`,
    data,
  );
  return response.data;
}

export async function deleteKanbanStage(id: number): Promise<void> {
  await api.delete(`/api/kanban-stages/${id}`);
}

export async function reorderKanbanStages(
  data: { id: number; order: number }[],
): Promise<void> {
  await api.patch("/api/kanban-stages/reorder", { items: data });
}

// ─── Activity Log API ────────────────────────────────────────────────────────

export async function getActivityLog(
  params?: Record<string, unknown>,
): Promise<{ items: ActivityLogEntry[]; total: number }> {
  const response = await api.get<{
    items: ActivityLogEntry[];
    total: number;
    limit: number;
    offset: number;
  }>("/api/activity-log", { params });
  return response.data;
}

// ─── Settings API ────────────────────────────────────────────────────────────

export async function getSettings(): Promise<Settings> {
  const response = await api.get<Settings>("/api/settings");
  return response.data;
}

export async function updateSettings(
  data: Partial<Settings>,
): Promise<Settings> {
  const response = await api.patch<Settings>("/api/settings", data);
  return response.data;
}

export async function updateProfile(
  data: UpdateProfileRequest,
): Promise<User> {
  const response = await api.patch<User>("/api/profile", data);
  return response.data;
}

export async function changePassword(
  data: ChangePasswordRequest,
): Promise<void> {
  await api.post("/api/profile/change-password", data);
}

export async function deleteAccount(): Promise<void> {
  await api.delete("/api/profile");
  clearTokens();
}

export default api;
