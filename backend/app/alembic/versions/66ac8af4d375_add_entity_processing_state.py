"""add_entity_processing_state

Revision ID: 66ac8af4d375
Revises: 201f8725bb72
Create Date: 2025-11-25 00:57:41.121559

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '66ac8af4d375'
down_revision = '201f8725bb72'
branch_labels = None
depends_on = None


def upgrade():
    # Add processing state columns to entities table
    op.add_column('entities', sa.Column('is_processed', sa.Boolean(), nullable=True, server_default='false'))
    op.add_column('entities', sa.Column('processed_at', sa.DateTime(), nullable=True))

    # Set default value for existing rows
    op.execute("UPDATE entities SET is_processed = false WHERE is_processed IS NULL")

    # Make is_processed not nullable after setting defaults
    op.alter_column('entities', 'is_processed', nullable=False)


def downgrade():
    op.drop_column('entities', 'processed_at')
    op.drop_column('entities', 'is_processed')
