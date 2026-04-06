"""expand seniority levels

Revision ID: b3c4d5e6f7a8
Revises: 9ef31070d83b
Create Date: 2026-03-12 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b3c4d5e6f7a8"
down_revision: Union[str, None] = "9ef31070d83b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# New values to add to the 'senioritylevel' PostgreSQL enum
NEW_VALUES = [
    "intern",
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
]


def upgrade() -> None:
    for value in NEW_VALUES:
        op.execute(f"ALTER TYPE senioritylevel ADD VALUE IF NOT EXISTS '{value}'")


def downgrade() -> None:
    # PostgreSQL does not support removing values from an enum type.
    # To fully downgrade, you would need to recreate the enum and migrate data.
    pass
