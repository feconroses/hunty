"""rename_scan_jobs_to_scan_careers_page

Revision ID: 516183b53f0a
Revises: 8ec1667ba329
Create Date: 2026-03-11 18:20:47.167982

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = '516183b53f0a'
down_revision: Union[str, None] = '8ec1667ba329'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE tasktype RENAME VALUE 'scan_jobs' TO 'scan_careers_page'")


def downgrade() -> None:
    op.execute("ALTER TYPE tasktype RENAME VALUE 'scan_careers_page' TO 'scan_jobs'")
