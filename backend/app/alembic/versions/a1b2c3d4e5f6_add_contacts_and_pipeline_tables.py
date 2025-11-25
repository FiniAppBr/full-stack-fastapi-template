"""add contacts and pipeline tables

Revision ID: a1b2c3d4e5f6
Revises: 1dde803e4394
Create Date: 2025-11-25 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = '1dde803e4394'
branch_labels = None
depends_on = None


def upgrade():
    # Create contacts table
    op.create_table(
        'contacts',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('phone', sa.String(), nullable=True),
        sa.Column('email', sa.String(), nullable=True),
        sa.Column('source', sa.String(), nullable=True, default='manual'),
        sa.Column('source_agent_id', sa.String(), nullable=True),
        sa.Column('data', sa.JSON(), nullable=True),
        sa.Column('pipeline_stage', sa.String(), nullable=True),
        sa.Column('assigned_to', sa.String(), nullable=True),
        sa.Column('tags', sa.JSON(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('last_interaction_at', sa.DateTime(), nullable=True),
        sa.Column('last_agent_id', sa.String(), nullable=True),
        sa.Column('conversation_count', sa.Integer(), nullable=False, default=0),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
    )

    # Create index on phone for quick lookup
    op.create_index('ix_contacts_phone', 'contacts', ['phone'])
    op.create_index('ix_contacts_pipeline_stage', 'contacts', ['pipeline_stage'])

    # Create pipeline_columns table
    op.create_table(
        'pipeline_columns',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('color', sa.String(), nullable=True, default='#00B8D9'),
        sa.Column('order', sa.Integer(), nullable=False, default=0),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
    )

    # Create pipeline_cards table
    op.create_table(
        'pipeline_cards',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('contact_id', sa.Integer(), sa.ForeignKey('contacts.id', ondelete='CASCADE'), nullable=False),
        sa.Column('column_id', sa.Integer(), sa.ForeignKey('pipeline_columns.id', ondelete='CASCADE'), nullable=False),
        sa.Column('order', sa.Integer(), nullable=False, default=0),
        sa.Column('priority', sa.String(), nullable=True, default='medium'),
        sa.Column('due_date', sa.DateTime(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('labels', sa.JSON(), nullable=True),
        sa.Column('last_activity_at', sa.DateTime(), nullable=True),
        sa.Column('moved_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
    )

    # Create indexes for pipeline cards
    op.create_index('ix_pipeline_cards_contact_id', 'pipeline_cards', ['contact_id'])
    op.create_index('ix_pipeline_cards_column_id', 'pipeline_cards', ['column_id'])


def downgrade():
    op.drop_table('pipeline_cards')
    op.drop_table('pipeline_columns')
    op.drop_table('contacts')
