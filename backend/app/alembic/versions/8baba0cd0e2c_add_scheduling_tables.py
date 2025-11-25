"""add_scheduling_tables

Revision ID: 8baba0cd0e2c
Revises: 66ac8af4d375
Create Date: 2025-11-25 02:09:58.622137

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes

# revision identifiers, used by Alembic.
revision = '8baba0cd0e2c'
down_revision = '66ac8af4d375'
branch_labels = None
depends_on = None


def upgrade():
    # Create bookings table
    op.create_table('bookings',
        sa.Column('service_id', sa.Integer(), nullable=True),
        sa.Column('professional_id', sa.Integer(), nullable=True),
        sa.Column('customer_name', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('customer_phone', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('customer_email', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('booking_date', sa.Date(), nullable=False),
        sa.Column('start_time', sa.Time(), nullable=False),
        sa.Column('end_time', sa.Time(), nullable=True),
        sa.Column('status', sa.Enum('PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW', name='bookingstatus'), nullable=False),
        sa.Column('notes', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('internal_notes', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('reference_code', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('source', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('agent_id', sa.Integer(), nullable=True),
        sa.Column('conversation_id', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('confirmed_at', sa.DateTime(), nullable=True),
        sa.Column('cancelled_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('extra_data', sa.JSON(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_bookings_reference_code'), 'bookings', ['reference_code'], unique=False)
    op.create_index('ix_bookings_booking_date', 'bookings', ['booking_date'], unique=False)
    op.create_index('ix_bookings_professional_id', 'bookings', ['professional_id'], unique=False)
    op.create_index('ix_bookings_service_id', 'bookings', ['service_id'], unique=False)
    op.create_index('ix_bookings_status', 'bookings', ['status'], unique=False)

    # Create schedules table
    op.create_table('schedules',
        sa.Column('professional_id', sa.Integer(), nullable=False),
        sa.Column('day_of_week', sa.Integer(), nullable=True),
        sa.Column('specific_date', sa.Date(), nullable=True),
        sa.Column('start_time', sa.Time(), nullable=False),
        sa.Column('end_time', sa.Time(), nullable=False),
        sa.Column('is_available', sa.Boolean(), nullable=False),
        sa.Column('slot_duration_minutes', sa.Integer(), nullable=False),
        sa.Column('break_between_minutes', sa.Integer(), nullable=False),
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('notes', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_schedules_professional_id', 'schedules', ['professional_id'], unique=False)
    op.create_index('ix_schedules_day_of_week', 'schedules', ['day_of_week'], unique=False)
    op.create_index('ix_schedules_specific_date', 'schedules', ['specific_date'], unique=False)

    # Create tasks table
    op.create_table('tasks',
        sa.Column('title', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('task_type', sa.Enum('FOLLOW_UP', 'LEAD', 'SUPPORT', 'INTERNAL', 'OTHER', name='tasktype'), nullable=False),
        sa.Column('priority', sa.Enum('LOW', 'MEDIUM', 'HIGH', 'URGENT', name='taskpriority'), nullable=False),
        sa.Column('status', sa.Enum('TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE', name='taskstatus'), nullable=False),
        sa.Column('assigned_to', sa.Integer(), nullable=True),
        sa.Column('due_date', sa.Date(), nullable=True),
        sa.Column('customer_name', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('customer_phone', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('customer_email', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('booking_id', sa.Integer(), nullable=True),
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('source', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('agent_id', sa.Integer(), nullable=True),
        sa.Column('conversation_id', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('extra_data', sa.JSON(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_tasks_status', 'tasks', ['status'], unique=False)
    op.create_index('ix_tasks_priority', 'tasks', ['priority'], unique=False)
    op.create_index('ix_tasks_due_date', 'tasks', ['due_date'], unique=False)
    op.create_index('ix_tasks_assigned_to', 'tasks', ['assigned_to'], unique=False)


def downgrade():
    # Drop tasks table
    op.drop_index('ix_tasks_assigned_to', table_name='tasks')
    op.drop_index('ix_tasks_due_date', table_name='tasks')
    op.drop_index('ix_tasks_priority', table_name='tasks')
    op.drop_index('ix_tasks_status', table_name='tasks')
    op.drop_table('tasks')

    # Drop schedules table
    op.drop_index('ix_schedules_specific_date', table_name='schedules')
    op.drop_index('ix_schedules_day_of_week', table_name='schedules')
    op.drop_index('ix_schedules_professional_id', table_name='schedules')
    op.drop_table('schedules')

    # Drop bookings table
    op.drop_index('ix_bookings_status', table_name='bookings')
    op.drop_index('ix_bookings_service_id', table_name='bookings')
    op.drop_index('ix_bookings_professional_id', table_name='bookings')
    op.drop_index('ix_bookings_booking_date', table_name='bookings')
    op.drop_index(op.f('ix_bookings_reference_code'), table_name='bookings')
    op.drop_table('bookings')

    # Drop enums
    op.execute('DROP TYPE IF EXISTS taskstatus')
    op.execute('DROP TYPE IF EXISTS taskpriority')
    op.execute('DROP TYPE IF EXISTS tasktype')
    op.execute('DROP TYPE IF EXISTS bookingstatus')
