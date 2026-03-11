export const TASK_TYPE_CONFIG = {
  find_careers_page: {
    label: "Find Careers Page",
    color: "blue" as const,
    icon: "Search",
  },
  scan_jobs: {
    label: "Scan Jobs",
    color: "purple" as const,
    icon: "FileSearch",
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
  "junior",
  "mid",
  "senior",
  "lead",
  "executive",
] as const;

export const DEFAULT_KANBAN_STAGES = [
  { name: "Discovered", color: "#6366f1", order: 0 },
  { name: "Interested", color: "#f59e0b", order: 1 },
  { name: "Applied", color: "#3b82f6", order: 2 },
  { name: "Interview", color: "#8b5cf6", order: 3 },
  { name: "Offer", color: "#1db954", order: 4 },
  { name: "Rejected", color: "#ef4444", order: 5 },
];

export const COMPANY_STATUS_CONFIG = {
  pending: { label: "Pending", color: "yellow" as const },
  active: { label: "Active", color: "green" as const },
  error: { label: "Error", color: "red" as const },
};
