// ─── Auth ────────────────────────────────────────────────────────────────────

export interface User {
  id: number;
  email: string;
  first_name: string | null;
  last_name: string | null;
  email_verified: boolean;
  is_active: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
}

export interface AuthResponse {
  access_token: string;
  csrf_token: string;
  user: User;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

// ─── Companies ───────────────────────────────────────────────────────────────

export type CompanyStatus = "pending" | "active" | "error";
export type CompanySource = "target" | "discovered";

export interface Company {
  id: number;
  user_id: number;
  name: string;
  url: string | null;
  careers_page_url: string | null;
  source: CompanySource;
  status: CompanyStatus;
  last_scanned_at: string | null;
  jobs_found_count: number;
  pending_tasks_count: number | null;
  created_at: string;
  updated_at: string;
}

// ─── LinkedIn Searches ──────────────────────────────────────────────────────

export interface LinkedInSearch {
  id: number;
  user_id: number;
  keywords: string;
  location: string | null;
  geo_id: string;
  employment_types: string[] | null;
  linkedin_url: string | null;
  is_active: boolean;
  last_scanned_at: string | null;
  jobs_found_count: number;
  pending_tasks_count: number | null;
  created_at: string;
  updated_at: string;
}

// ─── Jobs ────────────────────────────────────────────────────────────────────

export type WorkType = "remote" | "hybrid" | "onsite";
export type SeniorityLevel =
  | "intern" | "junior" | "mid" | "senior" | "staff" | "principal" | "distinguished"
  | "team_lead" | "manager" | "senior_manager" | "head" | "director" | "senior_director" | "vp" | "senior_vp" | "c_suite"
  | "lead" | "executive";

export interface Job {
  id: number;
  user_id: number;
  company_id: number | null;
  linkedin_search_id: number | null;
  title: string;
  url: string | null;
  location: string | null;
  work_type: WorkType | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  seniority_level: SeniorityLevel | null;
  department: string | null;
  skills: string[];
  language_requirements: string | null;
  description_summary: string | null;
  full_description: string | null;
  notes: string | null;
  kanban_stage_id: number | null;
  kanban_order: number;
  discovered_at: string;
  created_at: string;
  updated_at: string;
}

export interface EnrichedJob extends Job {
  company_name: string;
}

// ─── Kanban Stages ───────────────────────────────────────────────────────────

export interface KanbanStage {
  id: number;
  user_id: number;
  name: string;
  order: number;
  color: string;
  is_default: boolean;
  created_at: string;
}

// ─── Saved Job Summary ──────────────────────────────────────────────────────

export interface SavedJobSummary {
  job_id: number;
  title: string;
  company_name: string | null;
  url: string | null;
  saved_at: string;
}

// ─── Tasks ───────────────────────────────────────────────────────────────────

export type TaskType = "find_careers_page" | "scan_careers_page" | "scan_linkedin";
export type TaskStatus = "pending" | "completed" | "failed";
export type TaskQueue = "today" | "queue" | "scheduled";

export interface Task {
  id: number;
  user_id: number;
  company_id: number | null;
  linkedin_search_id: number | null;
  task_type: TaskType;
  status: TaskStatus;
  queue: TaskQueue;
  queue_order: number;
  parent_task_id: number | null;
  notes: string | null;
  result_data: Record<string, unknown> | null;
  scheduled_for: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  // Enrichment fields from API
  company_name: string | null;
  company_url: string | null;
  careers_page_url: string | null;
  filter_criteria: string | null;
  linkedin_search_name: string | null;
  linkedin_search_url: string | null;
  linkedin_search_location: string | null;
}

export interface CreateTaskRequest {
  company_id?: number;
  linkedin_search_id?: number;
  task_type: TaskType;
  queue?: TaskQueue;
  notes?: string;
  scheduled_for?: string;
}

export interface CompleteTaskRequest {
  result_data?: Record<string, unknown>;
  notes?: string;
}

// ─── Filter Rules ────────────────────────────────────────────────────────────

export type FilterRuleType = "include" | "exclude";

export interface FilterRule {
  id: number;
  user_id: number;
  company_id: number | null;
  linkedin_search_id: number | null;
  rule_type: FilterRuleType;
  value: string;
  logic_group: string | null;
  created_at: string;
}

// ─── Activity Log ────────────────────────────────────────────────────────────

export type EntityType = "company" | "job" | "task" | "filter" | "kanban_stage" | "linkedin_search";

export interface ActivityLogEntry {
  id: number;
  user_id: number;
  action: string;
  entity_type: EntityType;
  entity_id: number;
  details: Record<string, unknown> | null;
  created_at: string;
}

// ─── Settings ────────────────────────────────────────────────────────────────

export interface Settings {
  user_id: number;
  settings: Record<string, unknown>;
}

export interface UpdateProfileRequest {
  first_name?: string;
  last_name?: string;
  email?: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

// ─── API Responses ───────────────────────────────────────────────────────────

export interface JobsListResponse {
  items: Job[];
  total: number;
  limit: number;
  offset: number;
}

export interface ApiError {
  detail: string;
}
