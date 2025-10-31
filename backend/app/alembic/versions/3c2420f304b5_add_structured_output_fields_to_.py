"""Add structured output fields to conversation_log

Revision ID: 3c2420f304b5
Revises: f74e1eb63175
Create Date: 2025-10-31 18:00:05.827019

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '3c2420f304b5'
down_revision = 'f74e1eb63175'
branch_labels = None
depends_on = None


def upgrade():
    # Add new structured output columns with server defaults for existing rows
    op.add_column('conversation_log', sa.Column('sentiment', sqlmodel.sql.sqltypes.AutoString(), server_default='neutral', nullable=False))
    op.add_column('conversation_log', sa.Column('requires_handoff', sa.Boolean(), server_default='false', nullable=False))
    op.add_column('conversation_log', sa.Column('handoff_reason', sqlmodel.sql.sqltypes.AutoString(), server_default='none', nullable=False))
    op.add_column('conversation_log', sa.Column('urgency', sqlmodel.sql.sqltypes.AutoString(), server_default='normal', nullable=False))

    # Remove server defaults (application will handle defaults going forward)
    op.alter_column('conversation_log', 'sentiment', server_default=None)
    op.alter_column('conversation_log', 'requires_handoff', server_default=None)
    op.alter_column('conversation_log', 'handoff_reason', server_default=None)
    op.alter_column('conversation_log', 'urgency', server_default=None)


def downgrade():
    op.drop_column('conversation_log', 'urgency')
    op.drop_column('conversation_log', 'handoff_reason')
    op.drop_column('conversation_log', 'requires_handoff')
    op.drop_column('conversation_log', 'sentiment')
