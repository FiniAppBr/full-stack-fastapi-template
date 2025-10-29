"""change_vector_dimension_to_1024

Revision ID: c923cc5fc03b
Revises: 6cd1786ab6a6
Create Date: 2025-10-29 14:13:29.432777

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = 'c923cc5fc03b'
down_revision = '6cd1786ab6a6'
branch_labels = None
depends_on = None


def upgrade():
    # Drop and recreate the embedding column with new dimension
    # We'll lose existing data but we're going to re-embed anyway
    op.execute('ALTER TABLE knowledge_base DROP COLUMN embedding')
    op.execute('ALTER TABLE knowledge_base ADD COLUMN embedding vector(1024)')


def downgrade():
    # Reverse: change back to 1536 dimensions
    op.execute('ALTER TABLE knowledge_base DROP COLUMN embedding')
    op.execute('ALTER TABLE knowledge_base ADD COLUMN embedding vector(1536)')
