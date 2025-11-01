"""Add dynamic schema fields to agent table

Revision ID: 48f4c72ca7a9
Revises: 1e6294f5fa64
Create Date: 2025-11-01 01:34:53.980189

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '48f4c72ca7a9'
down_revision = '1e6294f5fa64'
branch_labels = None
depends_on = None


def upgrade():
    # Add three new JSON columns to agent table for dynamic schema configuration
    op.add_column('agent', sa.Column('response_schema', sa.JSON(), nullable=True))
    op.add_column('agent', sa.Column('multi_turn_config', sa.JSON(), nullable=True))
    op.add_column('agent', sa.Column('media_rules', sa.JSON(), nullable=True))


def downgrade():
    # Remove the three new columns
    op.drop_column('agent', 'media_rules')
    op.drop_column('agent', 'multi_turn_config')
    op.drop_column('agent', 'response_schema')
