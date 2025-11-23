"""add_labels_and_chunk_labels_tables

Revision ID: 059b86b77935
Revises: v2_knowledge_columns
Create Date: 2025-11-23 22:35:45.647547

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes

# revision identifiers, used by Alembic.
revision = '059b86b77935'
down_revision = 'v2_knowledge_columns'
branch_labels = None
depends_on = None


def upgrade():
    # Create labels table with hierarchy support
    op.create_table('labels',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('category', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('description', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('parent_id', sa.Integer(), nullable=True),
        sa.Column('deprecated', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['parent_id'], ['labels.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_labels_category'), 'labels', ['category'], unique=False)
    op.create_index(op.f('ix_labels_name'), 'labels', ['name'], unique=True)

    # Create chunk_labels junction table
    op.create_table('chunk_labels',
        sa.Column('chunk_id', sa.Integer(), nullable=False),
        sa.Column('label_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['chunk_id'], ['knowledge_base.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['label_id'], ['labels.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('chunk_id', 'label_id')
    )


def downgrade():
    op.drop_table('chunk_labels')
    op.drop_index(op.f('ix_labels_name'), table_name='labels')
    op.drop_index(op.f('ix_labels_category'), table_name='labels')
    op.drop_table('labels')
