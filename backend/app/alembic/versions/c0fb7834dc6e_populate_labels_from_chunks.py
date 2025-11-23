"""populate_labels_from_chunks

Revision ID: c0fb7834dc6e
Revises: 059b86b77935
Create Date: 2025-11-23 22:40:00.000000

Data migration to:
1. Extract unique labels from knowledge_base.labels array
2. Create Label records with auto-detected categories
3. Create ChunkLabel junction table entries
"""
from alembic import op
import sqlalchemy as sa
from datetime import datetime

# revision identifiers, used by Alembic.
revision = 'c0fb7834dc6e'
down_revision = '059b86b77935'
branch_labels = None
depends_on = None


def categorize_label(label_name: str) -> str:
    """Auto-detect category from label name pattern."""
    if label_name.startswith("stage:"):
        return "stages"
    elif label_name.startswith("objecao:") or label_name == "objecao":
        return "objections"
    elif label_name.startswith("caso_uso:"):
        return "use_cases"
    elif label_name in ("preco", "pagamento", "link", "onboarding", "boasvindas"):
        return "gated"
    else:
        return "content"


def upgrade():
    # Get connection for raw SQL
    conn = op.get_bind()

    # 1. Get all unique labels from knowledge_base
    result = conn.execute(sa.text("""
        SELECT DISTINCT unnest(labels) as label_name
        FROM knowledge_base
        WHERE labels IS NOT NULL
        ORDER BY label_name
    """))
    unique_labels = [row[0] for row in result]

    print(f"Found {len(unique_labels)} unique labels to migrate")

    # 2. Insert labels with auto-detected categories
    now = datetime.utcnow()
    label_id_map = {}

    for label_name in unique_labels:
        category = categorize_label(label_name)

        # Check for parent (e.g., "objecao:dinheiro" -> parent "objecao")
        parent_id = None
        if ":" in label_name:
            parent_name = label_name.split(":")[0]
            if parent_name in label_id_map:
                parent_id = label_id_map[parent_name]

        result = conn.execute(
            sa.text("""
                INSERT INTO labels (name, category, parent_id, deprecated, created_at, updated_at)
                VALUES (:name, :category, :parent_id, false, :now, :now)
                RETURNING id
            """),
            {"name": label_name, "category": category, "parent_id": parent_id, "now": now}
        )
        label_id = result.fetchone()[0]
        label_id_map[label_name] = label_id
        print(f"  Created label: {label_name} (category: {category}, id: {label_id})")

    # 3. Create chunk_labels entries from existing arrays
    result = conn.execute(sa.text("""
        SELECT id, labels FROM knowledge_base WHERE labels IS NOT NULL
    """))
    chunks = [(row[0], row[1]) for row in result]

    print(f"Migrating labels for {len(chunks)} chunks")

    for chunk_id, labels in chunks:
        for label_name in labels:
            if label_name in label_id_map:
                conn.execute(
                    sa.text("""
                        INSERT INTO chunk_labels (chunk_id, label_id, created_at)
                        VALUES (:chunk_id, :label_id, :now)
                        ON CONFLICT DO NOTHING
                    """),
                    {"chunk_id": chunk_id, "label_id": label_id_map[label_name], "now": now}
                )

    print("Migration complete!")


def downgrade():
    # Clear junction table (labels table will be dropped by previous migration's downgrade)
    conn = op.get_bind()
    conn.execute(sa.text("DELETE FROM chunk_labels"))
    conn.execute(sa.text("DELETE FROM labels"))
