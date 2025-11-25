"""add entity capabilities and operations tables

Revision ID: 1b11ae930ed4
Revises: a1b2c3d4e5f6
Create Date: 2025-11-25 13:52:28.894821

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes

# revision identifiers, used by Alembic.
revision = '1b11ae930ed4'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade():
    # Create new tables
    op.create_table('booking_configs',
        sa.Column('entity_id', sa.Integer(), nullable=False),
        sa.Column('duration_minutes', sa.Integer(), nullable=False, server_default='60'),
        sa.Column('buffer_minutes', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('max_per_day', sa.Integer(), nullable=True),
        sa.Column('requires_confirmation', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('allowed_days', sa.JSON(), nullable=True),
        sa.Column('advance_booking_days', sa.Integer(), nullable=False, server_default='30'),
        sa.Column('min_notice_hours', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['entity_id'], ['entities.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('entity_id', name='uq_booking_configs_entity')
    )

    op.create_table('entity_links',
        sa.Column('source_entity_id', sa.Integer(), nullable=False),
        sa.Column('target_entity_id', sa.Integer(), nullable=False),
        sa.Column('relationship_type', sqlmodel.sql.sqltypes.AutoString(), nullable=False, server_default='provides'),
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['source_entity_id'], ['entities.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['target_entity_id'], ['entities.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('source_entity_id', 'target_entity_id', 'relationship_type', name='uq_entity_link')
    )

    op.create_table('inventory',
        sa.Column('entity_id', sa.Integer(), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('reserved_quantity', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('low_stock_threshold', sa.Integer(), nullable=False, server_default='5'),
        sa.Column('sku', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('last_restocked_at', sa.DateTime(), nullable=True),
        sa.Column('last_sold_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['entity_id'], ['entities.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('entity_id', name='uq_inventory_entity')
    )

    # Add new columns to existing tables
    op.add_column('entities', sa.Column('capabilities', sa.JSON(), nullable=True, server_default='[]'))

    op.add_column('bookings', sa.Column('provider_id', sa.Integer(), nullable=True))
    op.add_column('bookings', sa.Column('contact_id', sa.Integer(), nullable=True))

    op.add_column('schedules', sa.Column('entity_id', sa.Integer(), nullable=True))

    # Migrate existing data: copy professional_id to entity_id in schedules
    op.execute('UPDATE schedules SET entity_id = professional_id WHERE professional_id IS NOT NULL')

    # Migrate existing data: copy professional_id to provider_id in bookings
    op.execute('UPDATE bookings SET provider_id = professional_id WHERE professional_id IS NOT NULL')


def downgrade():
    # Remove new columns
    op.drop_column('schedules', 'entity_id')
    op.drop_column('bookings', 'contact_id')
    op.drop_column('bookings', 'provider_id')
    op.drop_column('entities', 'capabilities')

    # Drop new tables
    op.drop_table('inventory')
    op.drop_table('entity_links')
    op.drop_table('booking_configs')
