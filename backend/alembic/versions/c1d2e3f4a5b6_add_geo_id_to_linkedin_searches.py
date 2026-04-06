"""add_geo_id_to_linkedin_searches

Revision ID: c1d2e3f4a5b6
Revises: b3c4d5e6f7a8
Create Date: 2026-03-17 12:00:00.000000

"""
from typing import Sequence, Union
from urllib.parse import urlencode

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "c1d2e3f4a5b6"
down_revision: Union[str, None] = "b3c4d5e6f7a8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

LINKEDIN_SEARCH_BASE = "https://www.linkedin.com/jobs/search-results/"


def _build_url(keywords: str, geo_id: str) -> str:
    params = {
        "keywords": keywords,
        "f_TPR": "r86400",
        "origin": "JOB_SEARCH_PAGE_LOCATION_AUTOCOMPLETE",
        "geoId": geo_id,
    }
    return f"{LINKEDIN_SEARCH_BASE}?{urlencode(params)}"


def upgrade() -> None:
    # Add geo_id column as nullable first
    op.add_column(
        "linkedin_searches",
        sa.Column("geo_id", sa.String(50), nullable=True),
    )

    # Backfill based on existing location values
    op.execute(
        "UPDATE linkedin_searches SET geo_id = '106967730', location = 'Berlin' "
        "WHERE LOWER(location) LIKE '%berlin%'"
    )
    op.execute(
        "UPDATE linkedin_searches SET geo_id = '100477049', location = 'Munich' "
        "WHERE LOWER(location) LIKE '%munich%' OR LOWER(location) LIKE '%münchen%'"
    )
    # Default remaining rows to Berlin
    op.execute(
        "UPDATE linkedin_searches SET geo_id = '106967730', location = 'Berlin' "
        "WHERE geo_id IS NULL"
    )

    # Make geo_id non-nullable
    op.alter_column("linkedin_searches", "geo_id", nullable=False)

    # Rebuild linkedin_url for all existing rows
    conn = op.get_bind()
    rows = conn.execute(
        sa.text("SELECT id, keywords, geo_id FROM linkedin_searches")
    ).fetchall()
    for row in rows:
        new_url = _build_url(row.keywords, row.geo_id)
        conn.execute(
            sa.text("UPDATE linkedin_searches SET linkedin_url = :url WHERE id = :id"),
            {"url": new_url, "id": row.id},
        )


def downgrade() -> None:
    op.drop_column("linkedin_searches", "geo_id")
