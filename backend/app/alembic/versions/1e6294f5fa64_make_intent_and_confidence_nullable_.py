"""Make intent and confidence nullable (deprecated)

Revision ID: 1e6294f5fa64
Revises: 3c2420f304b5
Create Date: 2025-10-31 23:50:58.765217

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '1e6294f5fa64'
down_revision = '3c2420f304b5'
branch_labels = None
depends_on = None


def upgrade():
    # Make deprecated fields nullable
    op.alter_column('conversation_log', 'intent',
               existing_type=sa.VARCHAR(),
               nullable=True)
    op.alter_column('conversation_log', 'confidence',
               existing_type=sa.DOUBLE_PRECISION(),
               nullable=True)


def downgrade():
    op.alter_column('conversation_log', 'confidence',
               existing_type=sa.DOUBLE_PRECISION(),
               nullable=False)
    op.alter_column('conversation_log', 'intent',
               existing_type=sa.VARCHAR(),
               nullable=False)
