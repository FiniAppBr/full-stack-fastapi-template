"""add_user_id_to_labels

Revision ID: 6b7d02992a7f
Revises: c0fb7834dc6e
Create Date: 2025-11-23 23:00:00.000000

Add user_id column to labels table for user-scoped labels.
Backfill existing labels with admin user.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '6b7d02992a7f'
down_revision = 'c0fb7834dc6e'
branch_labels = None
depends_on = None

# Admin user ID for backfilling existing labels
ADMIN_USER_ID = 'c029d301-a586-4a91-92a5-e44c2db5e608'


def upgrade():
    # Add user_id column (nullable first for backfill)
    op.add_column('labels', sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True))

    # Backfill existing labels with admin user
    op.execute(f"UPDATE labels SET user_id = '{ADMIN_USER_ID}'")

    # Make column NOT NULL after backfill
    op.alter_column('labels', 'user_id', nullable=False)

    # Add foreign key constraint
    op.create_foreign_key('fk_labels_user_id', 'labels', 'user', ['user_id'], ['id'])

    # Add index for user_id lookups
    op.create_index('ix_labels_user_id', 'labels', ['user_id'])

    # Drop the global unique constraint on name (was unique globally, now unique per user)
    op.drop_index('ix_labels_name', table_name='labels')

    # Create composite unique constraint (name unique per user)
    op.create_unique_constraint('uq_labels_user_name', 'labels', ['user_id', 'name'])

    # Recreate name index (non-unique now)
    op.create_index('ix_labels_name', 'labels', ['name'])


def downgrade():
    # Drop composite unique constraint
    op.drop_constraint('uq_labels_user_name', 'labels', type_='unique')

    # Drop name index
    op.drop_index('ix_labels_name', table_name='labels')

    # Recreate global unique index on name
    op.create_index('ix_labels_name', 'labels', ['name'], unique=True)

    # Drop user_id index
    op.drop_index('ix_labels_user_id', table_name='labels')

    # Drop foreign key
    op.drop_constraint('fk_labels_user_id', 'labels', type_='foreignkey')

    # Drop user_id column
    op.drop_column('labels', 'user_id')
