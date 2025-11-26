"""add custom icon color tag to neo_agents

Revision ID: aebab462771a
Revises: contact_fields_001
Create Date: 2025-11-26 23:25:33.970333

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes

# revision identifiers, used by Alembic.
revision = 'aebab462771a'
down_revision = 'contact_fields_001'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('neo_agents', sa.Column('custom_icon', sqlmodel.sql.sqltypes.AutoString(), nullable=True))
    op.add_column('neo_agents', sa.Column('custom_color', sqlmodel.sql.sqltypes.AutoString(), nullable=True))
    op.add_column('neo_agents', sa.Column('custom_tag', sqlmodel.sql.sqltypes.AutoString(), nullable=True))


def downgrade():
    op.drop_column('neo_agents', 'custom_tag')
    op.drop_column('neo_agents', 'custom_color')
    op.drop_column('neo_agents', 'custom_icon')
