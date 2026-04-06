import enum


class CompanySource(str, enum.Enum):
    target = "target"
    discovered = "discovered"


class CompanyStatus(str, enum.Enum):
    pending = "pending"
    active = "active"
    error = "error"


class WorkType(str, enum.Enum):
    remote = "remote"
    hybrid = "hybrid"
    onsite = "onsite"


class SeniorityLevel(str, enum.Enum):
    # IC track
    intern = "intern"
    junior = "junior"
    mid = "mid"
    senior = "senior"
    staff = "staff"
    principal = "principal"
    distinguished = "distinguished"
    # Management track
    team_lead = "team_lead"
    manager = "manager"
    senior_manager = "senior_manager"
    head = "head"
    director = "director"
    senior_director = "senior_director"
    vp = "vp"
    senior_vp = "senior_vp"
    c_suite = "c_suite"
    # Legacy (kept for backward compat)
    lead = "lead"
    executive = "executive"


class TaskType(str, enum.Enum):
    find_careers_page = "find_careers_page"
    scan_careers_page = "scan_careers_page"
    scan_linkedin = "scan_linkedin"


class TaskStatus(str, enum.Enum):
    pending = "pending"
    completed = "completed"
    failed = "failed"


class TaskQueue(str, enum.Enum):
    today = "today"
    queue = "queue"
    scheduled = "scheduled"
