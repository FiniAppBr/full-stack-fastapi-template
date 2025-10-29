"""convert metadata json to jsonb

Revision ID: f74e1eb63175
Revises: fd9bed24e31e
Create Date: 2025-10-29 20:11:28.762104

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = 'f74e1eb63175'
down_revision = 'fd9bed24e31e'
branch_labels = None
depends_on = None


def upgrade():
    # Convert metadata_ column from JSON to JSONB in blocks table
    op.execute("ALTER TABLE blocks ALTER COLUMN metadata_ TYPE jsonb USING metadata_::jsonb")


def downgrade():
    # Convert metadata_ column from JSONB back to JSON
    op.execute("ALTER TABLE blocks ALTER COLUMN metadata_ TYPE json USING metadata_::json")
