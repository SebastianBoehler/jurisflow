"""Add flexible embeddings and richer research result evidence fields."""

import sqlalchemy as sa
from alembic import op

revision = "0004_embedding_evidence"
down_revision = "0003_research_observability"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE document_chunks ALTER COLUMN embedding TYPE vector USING embedding::vector")

    op.add_column("research_results", sa.Column("source_id", sa.Text(), nullable=True))
    op.add_column("research_results", sa.Column("citations", sa.JSON(), nullable=False, server_default=sa.text("'[]'::json")))
    op.add_column("research_results", sa.Column("authority", sa.String(length=50), nullable=True))
    op.add_column("research_results", sa.Column("modality", sa.String(length=50), nullable=False, server_default="text"))
    op.add_column("research_results", sa.Column("document_id", sa.UUID(), nullable=True))
    op.add_column("research_results", sa.Column("chunk_id", sa.UUID(), nullable=True))

    op.alter_column("research_results", "citations", server_default=None)
    op.alter_column("research_results", "modality", server_default=None)


def downgrade() -> None:
    op.drop_column("research_results", "chunk_id")
    op.drop_column("research_results", "document_id")
    op.drop_column("research_results", "modality")
    op.drop_column("research_results", "authority")
    op.drop_column("research_results", "citations")
    op.drop_column("research_results", "source_id")

    op.execute("UPDATE document_chunks SET embedding = NULL WHERE embedding IS NOT NULL")
    op.execute("ALTER TABLE document_chunks ALTER COLUMN embedding TYPE vector(1536)")
