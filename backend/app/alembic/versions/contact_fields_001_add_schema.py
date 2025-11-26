"""add contact fields schema

Revision ID: contact_fields_001
Revises: drop_linked_agents_001
Create Date: 2025-11-26

Creates tables for contact field schema:
- contact_fields: Field definitions per workspace
- agent_field_configs: Agent-specific field collection rules
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'contact_fields_001'
down_revision = 'drop_linked_agents_001'
branch_labels = None
depends_on = None


def upgrade():
    # Create contact_fields table
    op.create_table(
        'contact_fields',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('key', sa.String(), nullable=False),
        sa.Column('label', sa.String(), nullable=False),
        sa.Column('field_type', sa.String(), nullable=False, server_default='text'),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('options', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('icon', sa.String(), nullable=True),
        sa.Column('show_in_list', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('show_in_card', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('display_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_contact_fields_key', 'contact_fields', ['key'], unique=False)

    # Create agent_field_configs table
    op.create_table(
        'agent_field_configs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('agent_id', sa.Integer(), nullable=False),
        sa.Column('field_id', sa.Integer(), nullable=False),
        sa.Column('necessity', sa.String(), nullable=False, server_default='optional'),
        sa.Column('collection_hint', sa.Text(), nullable=True),
        sa.Column('required_for_tools', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['field_id'], ['contact_fields.id'], ondelete='CASCADE'),
    )
    op.create_index('ix_agent_field_configs_agent_id', 'agent_field_configs', ['agent_id'], unique=False)
    op.create_index('ix_agent_field_configs_field_id', 'agent_field_configs', ['field_id'], unique=False)


def downgrade():
    op.drop_table('agent_field_configs')
    op.drop_table('contact_fields')
