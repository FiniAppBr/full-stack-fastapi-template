"""Add agent_log table for analytics

Revision ID: add_agent_log_001
Revises: 1b11ae930ed4
Create Date: 2025-11-25

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = 'add_agent_log_001'
down_revision = '1b11ae930ed4'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'agent_log',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('thread_id', sa.String(), nullable=False),
        sa.Column('agent_id', sa.Integer(), nullable=False),
        sa.Column('turn_number', sa.Integer(), nullable=False),
        sa.Column('user_message', sa.String(), nullable=False),
        sa.Column('agent_response', sa.String(), nullable=False),
        sa.Column('intent', sa.String(), nullable=False, server_default='unknown'),
        sa.Column('objection_type', sa.String(), nullable=True),
        sa.Column('traits', postgresql.JSON(), nullable=True, server_default='{}'),
        sa.Column('events', postgresql.JSON(), nullable=True, server_default='{}'),
        sa.Column('chunks_used', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('chunk_ids', postgresql.JSON(), nullable=True, server_default='[]'),
        sa.Column('examples_used', postgresql.JSON(), nullable=True, server_default='[]'),
        sa.Column('input_tokens', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('output_tokens', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('total_tokens', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('estimated_cost_usd', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('model_used', sa.String(), nullable=False, server_default='gpt-4o-mini'),
        sa.Column('escalation', sa.String(), nullable=True),
        sa.Column('requires_handoff', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('latency_ms', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_agent_log_thread_id', 'agent_log', ['thread_id'])
    op.create_index('ix_agent_log_agent_id', 'agent_log', ['agent_id'])
    op.create_index('ix_agent_log_intent', 'agent_log', ['intent'])
    op.create_index('ix_agent_log_created_at', 'agent_log', ['created_at'])


def downgrade() -> None:
    op.drop_index('ix_agent_log_created_at', table_name='agent_log')
    op.drop_index('ix_agent_log_intent', table_name='agent_log')
    op.drop_index('ix_agent_log_agent_id', table_name='agent_log')
    op.drop_index('ix_agent_log_thread_id', table_name='agent_log')
    op.drop_table('agent_log')
