"""
Content Schema - Chunks with labels and trait filtering.

Chunks are the atomic units of content that get assembled into context.
Labels provide flexible categorization (N:N relationship).
Trait filters allow content to be personalized based on user characteristics.
"""

from typing import Optional
from pydantic import BaseModel, Field


class Chunk(BaseModel):
    """
    A piece of content with labels and optional trait filtering.

    Labels examples:
        ["stage:conexao", "rapport"]
        ["objection", "objection:talent"]
        ["pricing", "payment"]

    Trait filter examples:
        {"skill_level": "zero"}
        {"skill_level": "intermediate", "use_case": "igreja"}
    """
    id: int
    labels: list[str] = Field(default_factory=list, description="Flexible categorization")
    title: Optional[str] = None
    content: str
    trait_filter: dict[str, str] = Field(default_factory=dict, description="Filter by user traits")
    token_count: int = 0
    embedding: Optional[list[float]] = Field(None, description="Vector embedding for semantic search")

    def matches_traits(self, traits: dict[str, Optional[str]]) -> bool:
        """
        Check if chunk matches current user traits.

        If no trait_filter, always matches.
        If trait_filter, all specified traits must match.
        """
        if not self.trait_filter:
            return True

        for trait_id, required_value in self.trait_filter.items():
            actual_value = traits.get(trait_id)
            if actual_value != required_value:
                return False

        return True

    def has_label(self, label: str) -> bool:
        """Check if chunk has a specific label."""
        return label in self.labels

    def has_any_label(self, labels: list[str]) -> bool:
        """Check if chunk has any of the specified labels."""
        return any(label in self.labels for label in labels)


class ChunkMatch(BaseModel):
    """
    Result of a chunk search/match operation.
    Includes the chunk and relevance score.
    """
    chunk: Chunk
    score: float = Field(1.0, description="Relevance score (1.0 for inject, 0-1 for search)")
    source_rule: Optional[str] = Field(None, description="Rule that selected this chunk")
