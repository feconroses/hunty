export const TASK_TYPE_CONFIG = {
  find_careers_page: {
    label: "Find Careers Page",
    color: "blue" as const,
    icon: "Search",
  },
  scan_careers_page: {
    label: "Scan Careers Page",
    color: "purple" as const,
    icon: "FileSearch",
  },
  scan_linkedin: {
    label: "Scan LinkedIn",
    color: "blue" as const,
    icon: "Linkedin",
  },
};

export const TASK_STATUS_CONFIG = {
  pending: { label: "Pending", color: "yellow" as const },
  completed: { label: "Completed", color: "green" as const },
  failed: { label: "Failed", color: "red" as const },
};

export const TASK_QUEUE_CONFIG = {
  today: { label: "Today" },
  queue: { label: "Queue" },
  scheduled: { label: "Scheduled" },
};

export const WORK_TYPES = ["remote", "hybrid", "onsite"] as const;
export const SENIORITY_LEVELS = [
  "intern",
  "junior",
  "mid",
  "senior",
  "staff",
  "principal",
  "distinguished",
  "team_lead",
  "manager",
  "senior_manager",
  "head",
  "director",
  "senior_director",
  "vp",
  "senior_vp",
  "c_suite",
] as const;

export const IC_SENIORITY_LEVELS = [
  "intern",
  "junior",
  "mid",
  "senior",
  "staff",
  "principal",
  "distinguished",
] as const;

export const MANAGEMENT_SENIORITY_LEVELS = [
  "team_lead",
  "manager",
  "senior_manager",
  "head",
  "director",
  "senior_director",
  "vp",
  "senior_vp",
  "c_suite",
] as const;

export const SENIORITY_LABELS: Record<string, string> = {
  intern: "Intern",
  junior: "Junior",
  mid: "Mid",
  senior: "Senior",
  staff: "Staff",
  principal: "Principal",
  distinguished: "Distinguished",
  team_lead: "Team Lead",
  manager: "Manager",
  senior_manager: "Senior Manager",
  head: "Head",
  director: "Director",
  senior_director: "Senior Director",
  vp: "VP",
  senior_vp: "Senior VP",
  c_suite: "C-Suite",
  // Legacy
  lead: "Lead",
  executive: "Executive",
};

export const DEFAULT_KANBAN_STAGES = [
  { name: "Discovered", color: "#6366f1", order: 0 },
  { name: "Interested", color: "#f59e0b", order: 1 },
  { name: "Applied", color: "#3b82f6", order: 2 },
  { name: "Interview", color: "#8b5cf6", order: 3 },
  { name: "Offer", color: "#1db954", order: 4 },
  { name: "Rejected", color: "#ef4444", order: 5 },
  { name: "Not Interested", color: "#6b7280", order: 6 },
  { name: "Unavailable", color: "#9ca3af", order: 7 },
];

export const COMPANY_STATUS_CONFIG = {
  pending: { label: "Pending", color: "yellow" as const },
  active: { label: "Active", color: "green" as const },
  error: { label: "Error", color: "red" as const },
};

