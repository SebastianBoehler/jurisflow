"""Expand research result fields for live legal source results."""

import sqlalchemy as sa
from alembic import op

revision = "0002_research_fields"
down_revision = "0001_initial_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "research_results",
        "title",
        existing_type=sa.String(length=255),
        type_=sa.Text(),
        existing_nullable=False,
        postgresql_using="title::text",
    )
    op.alter_column(
        "research_results",
        "citation",
        existing_type=sa.String(length=255),
        type_=sa.Text(),
        existing_nullable=True,
        postgresql_using="citation::text",
    )
    op.alter_column(
        "research_results",
        "url",
        existing_type=sa.String(length=500),
        type_=sa.Text(),
        existing_nullable=True,
        postgresql_using="url::text",
    )


def downgrade() -> None:
    op.alter_column(
        "research_results",
        "url",
        existing_type=sa.Text(),
        type_=sa.String(length=500),
        existing_nullable=True,
        postgresql_using="left(url, 500)",
    )
    op.alter_column(
        "research_results",
        "citation",
        existing_type=sa.Text(),
        type_=sa.String(length=255),
        existing_nullable=True,
        postgresql_using="left(citation, 255)",
    )
    op.alter_column(
        "research_results",
        "title",
        existing_type=sa.Text(),
        type_=sa.String(length=255),
        existing_nullable=False,
        postgresql_using="left(title, 255)",
    )
