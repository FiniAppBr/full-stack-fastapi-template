"""add_category_and_template_to_entities

Revision ID: 52323bbaf7e5
Revises: 16b124246497
Create Date: 2025-11-24 22:18:47.346682

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes

# revision identifiers, used by Alembic.
revision = '52323bbaf7e5'
down_revision = '16b124246497'
branch_labels = None
depends_on = None


# Mapping old type values to new category values
TYPE_TO_CATEGORY = {
    'product': 'products',
    'service': 'products',  # Services go to products category
    'policy': 'policies',
    'faq': 'faq',
    'custom': 'custom',
}


def upgrade():
    # Add new columns
    op.add_column('entities', sa.Column('category', sqlmodel.sql.sqltypes.AutoString(), nullable=True))
    op.add_column('entities', sa.Column('template', sqlmodel.sql.sqltypes.AutoString(), nullable=True))

    # Migrate data from type to category
    connection = op.get_bind()

    # Update existing rows: map type to category
    for old_type, new_category in TYPE_TO_CATEGORY.items():
        connection.execute(
            sa.text(f"UPDATE entities SET category = :category WHERE type = :type"),
            {"category": new_category, "type": old_type}
        )

    # Set default for any remaining rows
    connection.execute(
        sa.text("UPDATE entities SET category = 'custom' WHERE category IS NULL")
    )

    # Make category non-nullable
    op.alter_column('entities', 'category', nullable=False, server_default='custom')

    # Drop old type column
    op.drop_column('entities', 'type')


def downgrade():
    # Add type column back
    op.add_column('entities', sa.Column('type', sa.VARCHAR(), autoincrement=False, nullable=True))

    # Migrate data from category to type
    connection = op.get_bind()

    # Reverse mapping
    CATEGORY_TO_TYPE = {
        'products': 'product',
        'policies': 'policy',
        'faq': 'faq',
        'custom': 'custom',
        'people': 'custom',
        'locations': 'custom',
        'processes': 'custom',
        'brand': 'custom',
    }

    for category, old_type in CATEGORY_TO_TYPE.items():
        connection.execute(
            sa.text(f"UPDATE entities SET type = :type WHERE category = :category"),
            {"type": old_type, "category": category}
        )

    # Make type non-nullable
    op.alter_column('entities', 'type', nullable=False, server_default='custom')

    # Drop new columns
    op.drop_column('entities', 'template')
    op.drop_column('entities', 'category')
