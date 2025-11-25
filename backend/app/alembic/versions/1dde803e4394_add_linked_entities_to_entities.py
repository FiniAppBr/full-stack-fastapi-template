"""add linked_entities to entities

Revision ID: 1dde803e4394
Revises: 8baba0cd0e2c
Create Date: 2025-11-25 02:29:54.423253

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '1dde803e4394'
down_revision = '8baba0cd0e2c'
branch_labels = None
depends_on = None


def upgrade():
    # Add linked_entities column to entities table
    op.add_column('entities', sa.Column('linked_entities', sa.JSON(), nullable=True))


def downgrade():
    op.drop_column('entities', 'linked_entities')
