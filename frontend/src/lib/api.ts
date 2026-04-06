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
  LinkedInSearch,
  ActivityLogEntry,
  Settings,
  UpdateProfileRequest,
  ChangePasswordRequest,
} from "@/types";

// ─── Token Storage (in-memory + localStorage for resilience) ─────────────────

let accessToken: string | null = null;
let csrfToken: string | null = null;

const ACCESS_TOKEN_KEY = "hunty_access_token";
const CSRF_TOKEN_KEY = "hunty_csrf_token";

export function setAccessToken(token: string) {
  accessToken = token;
  try { localStorage.setItem(ACCESS_TOKEN_KEY, token); } catch {}
  const expiry = parseTokenExpiry(token);
  console.log(`[api] setAccessToken — expires in ${expiry ? Math.round((expiry - Date.now()) / 1000) : '?'}s`);
}

export function getAccessToken(): string | null {
  if (accessToken) return accessToken;
  try {
    const stored = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (stored) { accessToken = stored; return stored; }
  } catch {}
  return null;
}

export function setCsrfToken(token: string) {
  csrfToken = token;
  try { localStorage.setItem(CSRF_TOKEN_KEY, token); } catch {}
}

export function getCsrfToken(): string | null {
  if (csrfToken) return csrfToken;
  try {
    const stored = localStorage.getItem(CSRF_TOKEN_KEY);
    if (stored) { csrfToken = stored; return stored; }
  } catch {}
  return null;
}

export function clearTokens() {
  console.log("[api] clearTokens called");
  accessToken = null;
  csrfToken = null;
  try {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(CSRF_TOKEN_KEY);
  } catch {}
}

// ─── Token Expiry Parsing ────────────────────────────────────────────────────

export function parseTokenExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

// ─── Axios Instance ──────────────────────────────────────────────────────────

const api = axios.create({
  baseURL: "",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// ─── Auth Endpoints (skip for interceptor pre-checks) ───────────────────────

const AUTH_ENDPOINTS = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/refresh",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
];

// ─── Request Interceptor ─────────────────────────────────────────────────────

let isPreRefreshing = false;

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  // Pre-check: if access token is expired or about to expire, refresh first
  const isAuthEndpoint = AUTH_ENDPOINTS.some((ep) => config.url?.includes(ep));

  if (!isAuthEndpoint && !isPreRefreshing) {
    const token = getAccessToken();
    if (token) {
      const expiry = parseTokenExpiry(token);
      if (expiry && expiry - Date.now() < 30_000) {
        console.log(`[api] Request interceptor: token expires in ${Math.round((expiry - Date.now()) / 1000)}s — pre-refreshing before ${config.url}`);
        isPreRefreshing = true;
        try {
          const response = await refreshToken();
          setAccessToken(response.access_token);
          setCsrfToken(response.csrf_token);
          console.log("[api] Pre-refresh succeeded");
        } catch (err) {
          console.warn("[api] Pre-refresh failed, letting 401 interceptor handle it", err);
        } finally {
          isPreRefreshing = false;
        }
      }
    }
  }

  // Always attach current tokens (may have been refreshed above)
  const currentToken = getAccessToken();
  if (currentToken) {
    config.headers.Authorization = `Bearer ${currentToken}`;
  }
  const csrf = getCsrfToken();
  if (csrf) {
    config.headers["X-CSRF-Token"] = csrf;
  }
  return config;
});

// ─── Response Interceptor (401 refresh logic) ────────────────────────────────

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
      const detail = error.response?.data && typeof error.response.data === "object" && "detail" in error.response.data ? (error.response.data as { detail?: string }).detail : undefined;
      console.warn(`[api] 401 on ${originalRequest.url} — "${detail || "no detail"}" — attempting refresh (isRefreshing=${isRefreshing}, queueLen=${failedQueue.length})`);
      if (isRefreshing) {
        // Queue this request until the refresh completes
        console.log(`[api] Refresh already in progress — queuing ${originalRequest.url}`);
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
        console.log(`[api] 401 recovery succeeded — retrying ${originalRequest.url}`);
        return api(originalRequest);
      } catch (refreshError) {
        console.error("[api] 401 recovery FAILED — refresh token rejected. Redirecting to /login", refreshError);
        processQueue(refreshError, null);
        clearTokens();
        // Redirect to login if on client side
        if (typeof window !== "undefined") {
          window.location.href = "/login?expired";
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
  console.log("[api] refreshToken() called");
  try {
    const response = await api.post<AuthResponse>("/api/auth/refresh");
    const expiry = parseTokenExpiry(response.data.access_token);
    console.log(`[api] refreshToken() succeeded — new token expires in ${expiry ? Math.round((expiry - Date.now()) / 1000) : '?'}s`);
    return response.data;
  } catch (err) {
    const detail = (err as AxiosError<{ detail?: string }>)?.response?.data?.detail;
    const status = (err as AxiosError)?.response?.status;
    console.error(`[api] refreshToken() FAILED — status=${status}, detail="${detail || 'unknown'}"`);
    throw err;
  }
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
  companyId: number | null,
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

export async function addJobToTask(
  taskId: number,
  data: Record<string, unknown>,
): Promise<Task> {
  const response = await api.post<Task>(`/api/tasks/${taskId}/jobs`, data);
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

export async function getSectionOrder(): Promise<string[]> {
  const response = await api.get<{ sections: string[] }>(
    "/api/filters/section-order",
  );
  return response.data.sections;
}

export async function updateSectionOrder(sections: string[]): Promise<void> {
  await api.put("/api/filters/section-order", { sections });
}

export async function getFilterPrompt(companyId: number | string): Promise<string> {
  const response = await api.get<{ prompt: string }>(
    `/api/filters/prompt/${companyId}`,
  );
  return response.data.prompt;
}

// ─── LinkedIn Searches API ──────────────────────────────────────────────────

export async function getLinkedinSearches(): Promise<LinkedInSearch[]> {
  const response = await api.get<LinkedInSearch[]>("/api/linkedin-searches");
  return response.data;
}

export async function createLinkedinSearch(
  data: Partial<LinkedInSearch>,
): Promise<LinkedInSearch> {
  const response = await api.post<LinkedInSearch>("/api/linkedin-searches", data);
  return response.data;
}

export async function updateLinkedinSearch(
  id: number,
  data: Partial<LinkedInSearch>,
): Promise<LinkedInSearch> {
  const response = await api.patch<LinkedInSearch>(`/api/linkedin-searches/${id}`, data);
  return response.data;
}

export async function deleteLinkedinSearch(id: number): Promise<void> {
  await api.delete(`/api/linkedin-searches/${id}`);
}

export async function triggerLinkedinScan(id: number): Promise<Task> {
  const response = await api.post<Task>(`/api/linkedin-searches/${id}/scan`);
  return response.data;
}

export async function getLinkedinFilterPrompt(searchId: number | string): Promise<string> {
  const response = await api.get<{ prompt: string }>(
    `/api/filters/prompt/linkedin/${searchId}`,
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
