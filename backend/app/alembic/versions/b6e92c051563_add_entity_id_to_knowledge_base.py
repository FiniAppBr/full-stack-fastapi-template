"""add entity_id to knowledge_base

Revision ID: b6e92c051563
Revises: aebab462771a
Create Date: 2025-11-27 23:06:44.923067

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'b6e92c051563'
down_revision = 'aebab462771a'
branch_labels = None
depends_on = None


def upgrade():
    # Add entity_id column
    op.add_column('knowledge_base', sa.Column('entity_id', sa.Integer(), nullable=True))
    op.create_index('ix_knowledge_base_entity_id', 'knowledge_base', ['entity_id'])

    # Migrate existing data: parse entity:XX -> entity_id = XX
    op.execute("""
        UPDATE knowledge_base
        SET entity_id = CAST(REPLACE(agent_id, 'entity:', '') AS INTEGER)
        WHERE agent_id LIKE 'entity:%'
    """)


def downgrade():
    op.drop_index('ix_knowledge_base_entity_id', 'knowledge_base')
    op.drop_column('knowledge_base', 'entity_id')
