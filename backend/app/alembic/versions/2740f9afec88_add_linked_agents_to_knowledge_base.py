"""add linked_agents to knowledge_base

Revision ID: 2740f9afec88
Revises: add_agent_log_001
Create Date: 2025-11-25 18:02:53.655852

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '2740f9afec88'
down_revision = 'add_agent_log_001'
branch_labels = None
depends_on = None


def upgrade():
    # Add linked_agents column to knowledge_base
    op.add_column('knowledge_base', sa.Column('linked_agents', sa.ARRAY(sa.String()), nullable=True))


def downgrade():
    op.drop_column('knowledge_base', 'linked_agents')
