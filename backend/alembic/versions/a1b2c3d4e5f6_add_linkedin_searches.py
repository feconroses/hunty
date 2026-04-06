"""Add LinkedIn searches feature

Revision ID: a1b2c3d4e5f6
Revises: 970db8c36fd3
Create Date: 2026-03-11

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "970db8c36fd3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add CompanySource enum type
    company_source_enum = sa.Enum("target", "discovered", name="companysource")
    company_source_enum.create(op.get_bind(), checkfirst=True)

    # Add source column to companies
    op.add_column(
        "companies",
        sa.Column(
            "source",
            sa.Enum("target", "discovered", name="companysource"),
            nullable=False,
            server_default="target",
        ),
    )

    # Make companies.url nullable
    op.alter_column("companies", "url", existing_type=sa.String(512), nullable=True)

    # Add scan_linkedin to TaskType enum
    op.execute("ALTER TYPE tasktype ADD VALUE IF NOT EXISTS 'scan_linkedin'")

    # Create linkedin_searches table
    op.create_table(
        "linkedin_searches",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("name", sa.String(255), nullable=True),
        sa.Column("keywords", sa.String(500), nullable=False),
        sa.Column("location", sa.String(255), nullable=True),
        sa.Column("sort_by", sa.String(10), nullable=False, server_default="DD"),
        sa.Column("experience_levels", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("remote_options", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("easy_apply", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("has_verifications", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("under_10_applicants", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("fair_chance_employer", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("benefits", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("linkedin_url", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("last_scanned_at", sa.DateTime(), nullable=True),
        sa.Column("jobs_found_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
            nullable=False,
        ),
    )

    # Add linkedin_search_id to tasks
    op.add_column(
        "tasks",
        sa.Column(
            "linkedin_search_id",
            sa.Integer(),
            sa.ForeignKey("linkedin_searches.id"),
            nullable=True,
        ),
    )

    # Add linkedin_search_id to jobs and make company_id nullable
    op.alter_column("jobs", "company_id", existing_type=sa.Integer(), nullable=True)
    op.add_column(
        "jobs",
        sa.Column(
            "linkedin_search_id",
            sa.Integer(),
            sa.ForeignKey("linkedin_searches.id"),
            nullable=True,
        ),
    )

    # Add linkedin_search_id to filter_rules
    op.add_column(
        "filter_rules",
        sa.Column(
            "linkedin_search_id",
            sa.Integer(),
            sa.ForeignKey("linkedin_searches.id"),
            nullable=True,
        ),
    )


def downgrade() -> None:
    # Remove linkedin_search_id from filter_rules
    op.drop_column("filter_rules", "linkedin_search_id")

    # Remove linkedin_search_id from jobs and make company_id non-nullable
    op.drop_column("jobs", "linkedin_search_id")
    op.alter_column("jobs", "company_id", existing_type=sa.Integer(), nullable=False)

    # Remove linkedin_search_id from tasks
    op.drop_column("tasks", "linkedin_search_id")

    # Drop linkedin_searches table
    op.drop_table("linkedin_searches")

    # Make companies.url non-nullable
    op.alter_column("companies", "url", existing_type=sa.String(512), nullable=False)

    # Remove source column from companies
    op.drop_column("companies", "source")

    # Drop CompanySource enum
    sa.Enum(name="companysource").drop(op.get_bind(), checkfirst=True)
