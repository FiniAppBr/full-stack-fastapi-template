"""add_gating_and_validation_rules_to_agent

Revision ID: f0fe9b8ca32e
Revises: 48f4c72ca7a9
Create Date: 2025-11-01 16:23:08.617115

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = 'f0fe9b8ca32e'
down_revision = '48f4c72ca7a9'
branch_labels = None
depends_on = None


def upgrade():
    # Add two new JSON columns for behavior engines
    op.add_column('agent', sa.Column('gating_rules', sa.JSON(), nullable=True))
    op.add_column('agent', sa.Column('validation_rules', sa.JSON(), nullable=True))


def downgrade():
    # Remove the two new columns
    op.drop_column('agent', 'validation_rules')
    op.drop_column('agent', 'gating_rules')
