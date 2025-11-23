"""Add v2 columns to knowledge_base

Revision ID: v2_knowledge_columns
Revises: c923cc5fc03b
Create Date: 2025-01-01

Adds labels, trait_filter, and token_count columns for Context System v2.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ARRAY, JSON

# revision identifiers, used by Alembic.
revision = 'v2_knowledge_columns'
down_revision = 'b67e225fbd03'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add labels column (array of strings)
    op.add_column('knowledge_base', sa.Column('labels', ARRAY(sa.String()), nullable=True))

    # Add trait_filter column (JSON)
    op.add_column('knowledge_base', sa.Column('trait_filter', JSON(), nullable=True))

    # Add token_count column
    op.add_column('knowledge_base', sa.Column('token_count', sa.Integer(), nullable=False, server_default='0'))

    # Create index for labels (GIN index for array containment queries)
    op.create_index('ix_knowledge_base_labels', 'knowledge_base', ['labels'], postgresql_using='gin')


def downgrade() -> None:
    op.drop_index('ix_knowledge_base_labels', table_name='knowledge_base')
    op.drop_column('knowledge_base', 'token_count')
    op.drop_column('knowledge_base', 'trait_filter')
    op.drop_column('knowledge_base', 'labels')
