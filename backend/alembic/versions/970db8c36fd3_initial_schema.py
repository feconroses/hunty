"""initial schema

Revision ID: 970db8c36fd3
Revises:
Create Date: 2026-03-10 00:00:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "970db8c36fd3"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- users ---
    op.create_table(
        "users",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True, index=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("first_name", sa.String(100), nullable=True),
        sa.Column("last_name", sa.String(100), nullable=True),
        sa.Column("email_verified", sa.Boolean, nullable=False, server_default=sa.text("false")),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.text("true")),
        sa.Column("password_changed_at", sa.DateTime, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )

    # --- password_reset_tokens ---
    op.create_table(
        "password_reset_tokens",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("token", sa.String(512), nullable=False, unique=True, index=True),
        sa.Column("expires_at", sa.DateTime, nullable=False),
        sa.Column("used", sa.Boolean, nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )

    # --- companies ---
    op.create_table(
        "companies",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("url", sa.String(512), nullable=False),
        sa.Column("careers_page_url", sa.String(512), nullable=True),
        sa.Column(
            "status",
            sa.Enum("pending", "active", "error", name="companystatus"),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("last_scanned_at", sa.DateTime, nullable=True),
        sa.Column("jobs_found_count", sa.Integer, nullable=False, server_default=sa.text("0")),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )

    # --- kanban_stages ---
    op.create_table(
        "kanban_stages",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("order", sa.Integer, nullable=False, server_default=sa.text("0")),
        sa.Column("color", sa.String(20), nullable=False, server_default="'#6366f1'"),
        sa.Column("is_default", sa.Boolean, nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )

    # --- jobs ---
    op.create_table(
        "jobs",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("company_id", sa.Integer, sa.ForeignKey("companies.id"), nullable=False),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("url", sa.String(1024), nullable=True),
        sa.Column("location", sa.String(255), nullable=True),
        sa.Column(
            "work_type",
            sa.Enum("remote", "hybrid", "onsite", name="worktype"),
            nullable=True,
        ),
        sa.Column("salary_min", sa.Float, nullable=True),
        sa.Column("salary_max", sa.Float, nullable=True),
        sa.Column("salary_currency", sa.String(10), nullable=True, server_default="'USD'"),
        sa.Column(
            "seniority_level",
            sa.Enum("junior", "mid", "senior", "lead", "executive", name="senioritylevel"),
            nullable=True,
        ),
        sa.Column("department", sa.String(255), nullable=True),
        sa.Column("skills", sa.JSON, nullable=False, server_default="[]"),
        sa.Column("description_summary", sa.Text, nullable=True),
        sa.Column("full_description", sa.Text, nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("kanban_stage_id", sa.Integer, sa.ForeignKey("kanban_stages.id"), nullable=True),
        sa.Column("kanban_order", sa.Float, nullable=False, server_default=sa.text("0")),
        sa.Column("discovered_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )

    # --- tasks ---
    op.create_table(
        "tasks",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("company_id", sa.Integer, sa.ForeignKey("companies.id"), nullable=True),
        sa.Column(
            "task_type",
            sa.Enum("find_careers_page", "scan_jobs", name="tasktype"),
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.Enum("pending", "completed", "failed", name="taskstatus"),
            nullable=False,
            server_default="pending",
        ),
        sa.Column(
            "queue",
            sa.Enum("today", "queue", "scheduled", name="taskqueue"),
            nullable=False,
            server_default="queue",
        ),
        sa.Column("queue_order", sa.Float, nullable=False, server_default=sa.text("0")),
        sa.Column("parent_task_id", sa.Integer, sa.ForeignKey("tasks.id"), nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("result_data", sa.JSON, nullable=True),
        sa.Column("scheduled_for", sa.DateTime, nullable=True),
        sa.Column("completed_at", sa.DateTime, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )

    # --- filter_rules ---
    op.create_table(
        "filter_rules",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("company_id", sa.Integer, sa.ForeignKey("companies.id"), nullable=True),
        sa.Column("rule_type", sa.String(50), nullable=False),
        sa.Column("value", sa.Text, nullable=False),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )

    # --- activity_logs ---
    op.create_table(
        "activity_logs",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("action", sa.String(255), nullable=False),
        sa.Column("entity_type", sa.String(100), nullable=True),
        sa.Column("entity_id", sa.Integer, nullable=True),
        sa.Column("details", sa.JSON, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("activity_logs")
    op.drop_table("filter_rules")
    op.drop_table("tasks")
    op.drop_table("jobs")
    op.drop_table("kanban_stages")
    op.drop_table("companies")
    op.drop_table("password_reset_tokens")
    op.drop_table("users")

    # Drop enum types
    sa.Enum(name="companystatus").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="worktype").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="senioritylevel").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="tasktype").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="taskstatus").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="taskqueue").drop(op.get_bind(), checkfirst=True)
