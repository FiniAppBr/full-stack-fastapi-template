"""add block_id to knowledge_base

Revision ID: fd9bed24e31e
Revises: e33d6a2ccbb0
Create Date: 2025-10-29 20:02:43.628216

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = 'fd9bed24e31e'
down_revision = 'e33d6a2ccbb0'
branch_labels = None
depends_on = None


def upgrade():
    # Add block_id column to knowledge_base table
    op.add_column('knowledge_base', sa.Column('block_id', sa.Integer(), nullable=True))

    # Add foreign key constraint
    op.create_foreign_key(
        'fk_knowledge_base_block_id',
        'knowledge_base',
        'blocks',
        ['block_id'],
        ['id'],
        ondelete='CASCADE'
    )


def downgrade():
    # Remove foreign key constraint
    op.drop_constraint('fk_knowledge_base_block_id', 'knowledge_base', type_='foreignkey')

    # Remove block_id column
    op.drop_column('knowledge_base', 'block_id')
