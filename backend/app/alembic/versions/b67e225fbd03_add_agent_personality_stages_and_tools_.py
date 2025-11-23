"""add agent personality stages and tools fields

Revision ID: b67e225fbd03
Revises: 9fbbb35737b8
Create Date: 2025-11-23 00:19:55.598232

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes

# revision identifiers, used by Alembic.
revision = 'b67e225fbd03'
down_revision = '9fbbb35737b8'
branch_labels = None
depends_on = None


def upgrade():
    # Add new personality fields with defaults
    op.add_column('agent', sa.Column('tone', sqlmodel.sql.sqltypes.AutoString(), nullable=False, server_default='friendly'))
    op.add_column('agent', sa.Column('language', sqlmodel.sql.sqltypes.AutoString(), nullable=False, server_default='pt'))
    op.add_column('agent', sa.Column('emoji_usage', sqlmodel.sql.sqltypes.AutoString(), nullable=False, server_default='minimal'))

    # Add stages config
    op.add_column('agent', sa.Column('stages_enabled', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('agent', sa.Column('stages', sa.JSON(), nullable=True))

    # Add tools config
    op.add_column('agent', sa.Column('enabled_tools', sa.JSON(), nullable=True))
    op.add_column('agent', sa.Column('tool_configs', sa.JSON(), nullable=True))

    # Add handoff triggers
    op.add_column('agent', sa.Column('handoff_triggers', sa.JSON(), nullable=True))


def downgrade():
    op.drop_column('agent', 'handoff_triggers')
    op.drop_column('agent', 'tool_configs')
    op.drop_column('agent', 'enabled_tools')
    op.drop_column('agent', 'stages')
    op.drop_column('agent', 'stages_enabled')
    op.drop_column('agent', 'emoji_usage')
    op.drop_column('agent', 'language')
    op.drop_column('agent', 'tone')
