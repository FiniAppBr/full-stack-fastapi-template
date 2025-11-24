"""add_neo_agents_table

Revision ID: 201f8725bb72
Revises: 52323bbaf7e5
Create Date: 2025-11-24 23:09:50.842317

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes

# revision identifiers, used by Alembic.
revision = '201f8725bb72'
down_revision = '52323bbaf7e5'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('neo_agents',
        sa.Column('name', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('description', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('template', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('channels', sa.ARRAY(sa.String()), nullable=True),
        sa.Column('linked_entities', sa.ARRAY(sa.String()), nullable=True),
        sa.Column('config', sa.JSON(), nullable=True),
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('stats', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade():
    op.drop_table('neo_agents')
