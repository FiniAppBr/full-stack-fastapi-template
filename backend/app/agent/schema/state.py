"""
State Schema - The 2x2 extraction model.

                    | State (what IS)  | Event (what HAPPENED)
--------------------|------------------|----------------------
Permanent           | TRAIT            | GATE
Fluid               | MODE             | SIGNAL

- TRAIT = permanent state -> who the user IS (skill_level, use_case)
- GATE  = permanent event -> what HAS happened (interest_confirmed, link_sent)
- MODE  = fluid state -> where we ARE now (discovery, objection_handling)
- SIGNAL = fluid event -> what JUST happened (intent: objection)
"""

from __future__ import annotations
from typing import Optional, Literal, TYPE_CHECKING
from pydantic import BaseModel, Field

if TYPE_CHECKING:
    from .rules import Condition


class Gate(BaseModel):
    """
    Cumulative checkpoint - once set, stays set.
    Controls what content is allowed.
    Condition defines when this gate becomes True.
    """
    id: str
    name: str
    required_for: list[str] = Field(default_factory=list, description="Labels this gate unlocks")
    enforcement: Literal["hard", "soft"] = "soft"
    condition: Optional["Condition"] = Field(None, description="Condition that sets this gate")


class Trait(BaseModel):
    """
    Persistent user characteristic - detected early, branches content.
    """
    id: str
    name: str
    type: Literal["enum", "string", "boolean"] = "string"
    options: list[str] = Field(default_factory=list, description="Valid values if type=enum")
    detection_hint: str = Field("", description="Helps LLM extract this trait")


class Objective(BaseModel):
    """
    A goal to pursue in a mode - guides ending questions.
    """
    target: str = Field(..., description="What to fill: 'trait.skill_level' or 'gate.interest_confirmed'")
    hint: str = Field(..., description="Question guidance: 'Pergunte sobre experiência musical'")


class Mode(BaseModel):
    """
    Current conversational focus - shifts fluidly per-message.

    Modes define behavioral context:
    - What content to inject (default_labels)
    - How to behave (instructions)
    - What to achieve before moving on (objectives)
    - What to avoid (avoid)

    Rules decide WHEN to shift modes, Mode defines HOW to behave once there.
    """
    id: str
    name: str
    default_labels: list[str] = Field(default_factory=list, description="Labels to inject when in this mode")

    # Behavioral instructions for Generate stage
    instructions: str = Field("", description="How to behave in this mode - injected into system prompt")
    objectives: list[Objective] = Field(default_factory=list, description="What to achieve - guides ending questions")
    avoid: list[str] = Field(default_factory=list, description="What NOT to do in this mode (e.g., 'mentioning price')")


class Signal(BaseModel):
    """
    Per-message detection - ephemeral, triggers reactions.
    """
    id: str
    name: str
    type: Literal["enum", "string", "boolean"] = "enum"
    options: list[str] = Field(default_factory=list, description="Valid values if type=enum")
    detection_hint: str = Field("", description="Helps LLM detect this signal")


class RuntimeState(BaseModel):
    """
    Runtime state object - current state of the conversation.
    Updated after each extraction.
    """
    # Permanent events (cumulative)
    gates: dict[str, bool] = Field(default_factory=dict)

    # Permanent state (user characteristics)
    traits: dict[str, Optional[str]] = Field(default_factory=dict)

    # Fluid state (current focus)
    mode: str = "conexao"

    # Fluid events (per-message, reset each turn)
    signals: dict[str, Optional[str]] = Field(default_factory=dict)

    # Metadata
    last_message: str = ""
    turn_count: int = 0


class ExtractionResult(BaseModel):
    """
    Result of the extraction pipeline stage.
    Contains all detected/updated state.
    """
    # What was detected this turn
    signals: dict[str, Optional[str]] = Field(default_factory=dict)

    # Updates to apply (only changed values)
    trait_updates: dict[str, str] = Field(default_factory=dict)
    gate_updates: dict[str, bool] = Field(default_factory=dict)
    mode_shift: Optional[str] = None

    # For debugging/logging
    reasoning: str = ""
