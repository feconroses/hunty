import enum


class CompanyStatus(str, enum.Enum):
    pending = "pending"
    active = "active"
    error = "error"


class WorkType(str, enum.Enum):
    remote = "remote"
    hybrid = "hybrid"
    onsite = "onsite"


class SeniorityLevel(str, enum.Enum):
    junior = "junior"
    mid = "mid"
    senior = "senior"
    lead = "lead"
    executive = "executive"


class TaskType(str, enum.Enum):
    find_careers_page = "find_careers_page"
    scan_jobs = "scan_jobs"


class TaskStatus(str, enum.Enum):
    pending = "pending"
    completed = "completed"
    failed = "failed"


class TaskQueue(str, enum.Enum):
    today = "today"
    queue = "queue"
    scheduled = "scheduled"
