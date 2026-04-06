"""add_unavailable_kanban_stage

Revision ID: d2e3f4a5b6c7
Revises: c1d2e3f4a5b6
Create Date: 2026-03-27 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "d2e3f4a5b6c7"
down_revision: Union[str, None] = "c1d2e3f4a5b6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # Get all distinct user_ids from kanban_stages
    users = conn.execute(
        sa.text("SELECT DISTINCT user_id FROM kanban_stages")
    ).fetchall()

    for (user_id,) in users:
        # Check if the user already has an "Unavailable" stage
        existing = conn.execute(
            sa.text(
                "SELECT id FROM kanban_stages "
                "WHERE user_id = :uid AND name = 'Unavailable'"
            ),
            {"uid": user_id},
        ).fetchone()

        if existing is None:
            conn.execute(
                sa.text(
                    "INSERT INTO kanban_stages (user_id, name, color, \"order\", is_default) "
                    "VALUES (:uid, 'Unavailable', '#9ca3af', 7, true)"
                ),
                {"uid": user_id},
            )


def downgrade() -> None:
    op.execute(
        "DELETE FROM kanban_stages WHERE name = 'Unavailable' AND is_default = true"
    )
