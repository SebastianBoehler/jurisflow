"""Add research run observability and artifact fields."""

import sqlalchemy as sa
from alembic import op

revision = "0003_research_observability"
down_revision = "0002_research_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("research_runs", sa.Column("focus", sa.Text(), nullable=True))
    op.add_column("research_runs", sa.Column("sources", sa.JSON(), nullable=False, server_default=sa.text("'[]'::json")))
    op.add_column("research_runs", sa.Column("filters", sa.JSON(), nullable=False, server_default=sa.text("'{}'::json")))
    op.add_column("research_runs", sa.Column("max_results", sa.Integer(), nullable=False, server_default="8"))
    op.add_column("research_runs", sa.Column("deep_research", sa.Boolean(), nullable=False, server_default=sa.text("true")))
    op.add_column("research_runs", sa.Column("trace", sa.JSON(), nullable=False, server_default=sa.text("'[]'::json")))
    op.add_column("research_runs", sa.Column("artifacts", sa.JSON(), nullable=False, server_default=sa.text("'[]'::json")))

    op.alter_column("research_runs", "sources", server_default=None)
    op.alter_column("research_runs", "filters", server_default=None)
    op.alter_column("research_runs", "max_results", server_default=None)
    op.alter_column("research_runs", "deep_research", server_default=None)
    op.alter_column("research_runs", "trace", server_default=None)
    op.alter_column("research_runs", "artifacts", server_default=None)


def downgrade() -> None:
    op.drop_column("research_runs", "artifacts")
    op.drop_column("research_runs", "trace")
    op.drop_column("research_runs", "deep_research")
    op.drop_column("research_runs", "max_results")
    op.drop_column("research_runs", "filters")
    op.drop_column("research_runs", "sources")
    op.drop_column("research_runs", "focus")
