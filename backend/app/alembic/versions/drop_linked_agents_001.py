"""drop linked_agents from knowledge_base

Revision ID: drop_linked_agents_001
Revises: 2740f9afec88
Create Date: 2025-11-25

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'drop_linked_agents_001'
down_revision = '2740f9afec88'
branch_labels = None
depends_on = None


def upgrade():
    op.drop_column('knowledge_base', 'linked_agents')


def downgrade():
    op.add_column('knowledge_base', sa.Column('linked_agents', sa.ARRAY(sa.String()), nullable=True))
